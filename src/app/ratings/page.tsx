import { loadLatestAnalysis } from "../../lib/realAnalysis";
import RealRatings from "../../components/RealRatings";
import DemoRatings from "../../components/DemoRatings";

export const dynamic = "force-dynamic";

export default async function RatingsPage({ searchParams }: { searchParams?: { match?: string } }) {
  const real = await loadLatestAnalysis(typeof searchParams?.match === "string" ? searchParams.match : undefined);
  if (real?.shot?.analysis) return <RealRatings real={real} />;
  return <DemoRatings />;
}
