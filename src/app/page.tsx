import { loadLatestAnalysis } from "../lib/realAnalysis";
import RealDashboard from "../components/RealDashboard";
import DemoDashboard from "../components/DemoDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const real = await loadLatestAnalysis();
  if (real && (real.ball || real.shot?.analysis)) return <RealDashboard real={real} />;
  return <DemoDashboard />;
}
