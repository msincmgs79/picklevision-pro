import type { SupabaseClient } from "@supabase/supabase-js";
import { VIDEO_BUCKET } from "../supabase/config";

// Client-side storage helpers. In Supabase mode the browser can sign/delete
// directly (anon key + RLS). In R2 mode the secrets live server-side, so the
// browser asks the /api/storage route to presign or delete on its behalf.
const useR2 = process.env.NEXT_PUBLIC_STORAGE_BACKEND === "r2";

async function storageApi(body: Record<string, unknown>): Promise<any> {
  const res = await fetch("/api/storage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Storage request failed.");
  return data;
}

// Signed GET URL for a private video (for <video src> and for handing to Railway).
export async function clientReadUrl(
  supabase: SupabaseClient,
  key: string,
  expiresIn = 600
): Promise<string> {
  if (useR2) {
    const { url } = await storageApi({ op: "get", path: key });
    if (!url) throw new Error("Could not sign the video URL.");
    return url as string;
  }
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(key, expiresIn);
  if (error || !data?.signedUrl) throw new Error("Could not sign the video URL.");
  return data.signedUrl;
}

export async function clientDelete(supabase: SupabaseClient, key: string): Promise<void> {
  if (useR2) {
    await storageApi({ op: "delete", path: key });
    return;
  }
  await supabase.storage.from(VIDEO_BUCKET).remove([key]);
}
