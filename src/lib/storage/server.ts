import type { SupabaseClient } from "@supabase/supabase-js";
import { VIDEO_BUCKET } from "../supabase/config";

// Which storage backend is live. A single public flag flips the whole app
// between Supabase Storage and Cloudflare R2, so the cutover is one env var.
export const useR2 = process.env.NEXT_PUBLIC_STORAGE_BACKEND === "r2";

// Server-side signed GET URL for a stored video key, regardless of backend.
// Used by server components / route handlers (matches page, /api/analyze, review).
export async function signedReadUrl(
  supabase: SupabaseClient,
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  if (useR2) {
    const { r2PresignGet } = await import("./r2"); // keep aws-sdk out of non-R2 paths
    return r2PresignGet(key, expiresIn);
  }
  const { data } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(key, expiresIn);
  return data?.signedUrl ?? null;
}
