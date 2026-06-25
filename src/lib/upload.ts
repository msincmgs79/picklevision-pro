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

// Presigned single-PUT to R2. The presigned URL is fetched from /api/storage,
// which signs it for the file's content-type — we must send the same type.
async function r2Upload(file: File, path: string, onProgress: (pct: number) => void): Promise<void> {
  const contentType = file.type || "video/mp4";
  const res = await fetch("/api/storage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "put", path, contentType }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.url) throw new Error(json?.error || "Could not start the upload.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", json.url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
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
