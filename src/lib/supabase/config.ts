// Central place to read Supabase env vars. The app stays fully functional in
// "demo mode" when these are not set — every backend feature checks this flag.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const VIDEO_BUCKET = "match-videos";
