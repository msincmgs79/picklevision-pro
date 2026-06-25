import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";
import { signedReadUrl } from "../../../lib/storage/server";
import MatchPlayer from "../../../components/MatchPlayer";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="page-title">Match</h1>
        <p className="page-sub">Connect Supabase to view uploaded matches.</p>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div>
        <h1 className="page-title">Sign in required</h1>
        <Link href="/login" className="btn btn-primary" style={{ marginTop: 14 }}>Sign in →</Link>
      </div>
    );
  }

  const { data: match } = await supabase.from("matches").select("*").eq("id", params.id).single();
  if (!match) notFound();

  let videoUrl: string | null = null;
  if (match.video_path) {
    videoUrl = await signedReadUrl(supabase, match.video_path, 60 * 60);
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("match_id", params.id)
    .order("t", { ascending: true });

  return <MatchPlayer match={match} videoUrl={videoUrl} initialBookmarks={bookmarks || []} />;
}
