import { loadLatestAnalysis } from "../../lib/realAnalysis";
import RealShotExplorer from "../../components/RealShotExplorer";
import DemoShotExplorer from "../../components/DemoShotExplorer";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ searchParams }: { searchParams?: { match?: string } }) {
  const real = await loadLatestAnalysis(typeof searchParams?.match === "string" ? searchParams.match : undefined);
  if (real && (real.ball || real.shot?.analysis)) return <RealShotExplorer real={real} />;
  return <DemoShotExplorer />;
}
