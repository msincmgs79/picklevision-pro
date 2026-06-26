import { loadLatestAnalysis, loadRatingsRollup } from "../lib/realAnalysis";
import RealDashboard from "../components/RealDashboard";
import DemoDashboard from "../components/DemoDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams?: { match?: string } }) {
  const real = await loadLatestAnalysis(typeof searchParams?.match === "string" ? searchParams.match : undefined);
  if (real && (real.ball || real.shot?.analysis)) {
    const rollup = await loadRatingsRollup();
    return <RealDashboard real={real} rollup={rollup} />;
  }
  return <DemoDashboard />;
}
