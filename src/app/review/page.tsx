import { loadLatestReview } from "../../lib/realAnalysis";
import RealReview from "../../components/RealReview";
import DemoReview from "../../components/DemoReview";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const review = await loadLatestReview();
  if (review && review.videoUrl) return <RealReview review={review} />;
  return <DemoReview />;
}
