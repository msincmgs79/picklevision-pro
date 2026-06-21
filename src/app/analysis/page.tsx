import { loadLatestAnalysis } from "../../lib/realAnalysis";
import RealShotExplorer from "../../components/RealShotExplorer";
import DemoShotExplorer from "../../components/DemoShotExplorer";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const real = await loadLatestAnalysis();
  if (real && (real.ball || real.shot?.analysis)) return <RealShotExplorer real={real} />;
  return <DemoShotExplorer />;
}
