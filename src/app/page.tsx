import { loadLatestAnalysis, loadRatingsRollup } from "../lib/realAnalysis";
import { createClient } from "../lib/supabase/server";
import { isSupabaseConfigured } from "../lib/supabase/config";
import RealDashboard from "../components/RealDashboard";
import DemoDashboard from "../components/DemoDashboard";
import Landing from "../components/Landing";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams?: { match?: string } }) {
  // Anonymous visitors get the SEO/GEO marketing landing page (the root domain is
  // the highest-value page to rank). Signed-in users get the app.
  if (isSupabaseConfigured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return <Landing />;
  } else {
    return <Landing />;
  }

  const real = await loadLatestAnalysis(typeof searchParams?.match === "string" ? searchParams.match : undefined);
  if (real && (real.ball || real.shot?.analysis)) {
    const rollup = await loadRatingsRollup();
    return <RealDashboard real={real} rollup={rollup} />;
  }
  return <DemoDashboard />;
}
