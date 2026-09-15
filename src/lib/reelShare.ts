import { supabaseAdmin, serviceRoleConfigured } from "./share";
import { signedReadUrl } from "./storage/server";

// The only fields a public reel page exposes. The storage key stays server-side;
// the browser only ever sees a short-lived signed video URL.
export interface SharedReel {
  title: string;
  videoUrl: string;
  seconds: number | null;
  moments: number | null;
  createdAt: string | null;
}

// Loads a shared reel by token via the service role, then signs a read URL for
// its stored mp4. Returns null if the token is unknown or the video can't be signed.
export async function loadSharedReel(token: string): Promise<SharedReel | null> {
  if (!serviceRoleConfigured || !token) return null;
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("reels")
    .select("storage_key,title,seconds,moments,created_at")
    .eq("share_token", token)
    .maybeSingle();
  if (error || !data) return null;

  const url = await signedReadUrl(admin, data.storage_key as string, 3600);
  if (!url) return null;

  return {
    title: (data.title as string) || "Highlight reel",
    videoUrl: url,
    seconds: (data.seconds as number) ?? null,
    moments: (data.moments as number) ?? null,
    createdAt: (data.created_at as string) ?? null,
  };
}
