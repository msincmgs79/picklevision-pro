import { loadLatestAnalysis } from "../../lib/realAnalysis";
import RealRatings from "../../components/RealRatings";
import DemoRatings from "../../components/DemoRatings";

export const dynamic = "force-dynamic";

export default async function RatingsPage() {
  const real = await loadLatestAnalysis();
  if (real?.shot?.analysis) return <RealRatings real={real} />;
  return <DemoRatings />;
}
