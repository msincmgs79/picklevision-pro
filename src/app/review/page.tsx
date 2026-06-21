import { loadLatestReview } from "../../lib/realAnalysis";
import RealReview from "../../components/RealReview";
import DemoReview from "../../components/DemoReview";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams?: { match?: string } }) {
  const review = await loadLatestReview(typeof searchParams?.match === "string" ? searchParams.match : undefined);
  if (review && review.videoUrl) return <RealReview review={review} />;
  return <DemoReview />;
}
