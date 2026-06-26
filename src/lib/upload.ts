import * as tus from "tus-js-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, VIDEO_BUCKET } from "./supabase/config";

const useR2 = process.env.NEXT_PUBLIC_STORAGE_BACKEND === "r2";

// Upload a video to whichever storage backend is live. R2 uses a presigned PUT
// (single request, up to 5 GB); Supabase uses resumable TUS. Both report % via
// onProgress so the UI is identical.
export async function uploadVideo(
  supabase: SupabaseClient,
  file: File,
  path: string,
  onProgress: (pct: number) => void
): Promise<void> {
  if (useR2) return r2Upload(file, path, onProgress);
  return resumableUpload(supabase, file, path, onProgress);
}

const PART_SIZE = 10 * 1024 * 1024; // 10 MB parts
const PART_RETRIES = 3;

async function storageApi(body: Record<string, unknown>): Promise<any> {
  const res = await fetch("/api/storage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Storage request failed.");
  return json;
}

// Chunked multipart upload to R2. Each part is a small, independently-retryable
// presigned PUT, so a single network blip no longer dooms a 100 MB+ transfer
// (a single one-shot PUT of a large file silently drops mid-stream).
async function r2Upload(file: File, path: string, onProgress: (pct: number) => void): Promise<void> {
  const contentType = file.type || "video/mp4";
  const { uploadId } = await storageApi({ op: "create-multipart", path, contentType });
  if (!uploadId) throw new Error("Could not start the upload.");

  const total = file.size;
  const partCount = Math.max(1, Math.ceil(total / PART_SIZE));
  const parts: { PartNumber: number; ETag: string }[] = [];
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < partCount; i++) {
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, total);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;
      const { url } = await storageApi({ op: "sign-part", path, uploadId, partNumber });
      const etag = await putPart(url, chunk, (sent) =>
        onProgress(Math.min(99, Math.round(((uploadedBytes + sent) / total) * 100)))
      );
      uploadedBytes += end - start;
      onProgress(Math.min(99, Math.round((uploadedBytes / total) * 100)));
      parts.push({ PartNumber: partNumber, ETag: etag });
    }
    await storageApi({ op: "complete-multipart", path, uploadId, parts });
    onProgress(100);
  } catch (err) {
    // Best-effort cleanup so abandoned parts don't linger.
    try { await storageApi({ op: "abort-multipart", path, uploadId }); } catch {}
    throw err;
  }
}

// PUT one part and return its ETag (required to complete the upload). Retries a
// few times on transient network failures before giving up.
async function putPart(
  url: string,
  chunk: Blob,
  onPartProgress: (sent: number) => void,
  attempt = 0
): Promise<string> {
  try {
    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onPartProgress(e.loaded);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader("ETag");
          etag ? resolve(etag) : reject(new Error("Upload part missing ETag."));
        } else {
          reject(new Error(`Upload failed (${xhr.status}).`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.send(chunk);
    });
  } catch (err) {
    if (attempt < PART_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return putPart(url, chunk, onPartProgress, attempt + 1);
    }
    throw err;
  }
}

// Resumable (TUS) upload to Supabase Storage. Auto-retries dropped chunks and
// reports real progress — essential for videos up to 1 GB, where a plain
// one-shot upload would restart from zero on any network blip.
export async function resumableUpload(
  supabase: SupabaseClient,
  file: File,
  path: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired — please sign in again.");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, "x-upsert": "true" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6 MB chunks
      metadata: {
        bucketName: VIDEO_BUCKET,
        objectName: path,
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
      },
      onError: reject,
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    upload
      .findPreviousUploads()
      .then((prev) => {
        if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
      })
      .catch(reject);
  });
}
