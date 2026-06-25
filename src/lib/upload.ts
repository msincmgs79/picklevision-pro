import * as tus from "tus-js-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, VIDEO_BUCKET } from "./supabase/config";

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
