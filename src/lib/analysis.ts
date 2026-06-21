// Client + server shared types and helpers for the ball-detection backend
// (the FastAPI /infer service running on Railway).

export interface BallDetection {
  frameNum: number;
  timestamp: number;
  pixelX: number;
  pixelY: number;
  confidence: number;
  courtX: number; // 0..20 ft (court width)
  courtY: number; // 0..44 ft (court length)
}

export interface InferenceResult {
  success: boolean;
  totalFrames: number;
  detectionsFound: number;
  fps: number;
  duration: number;
  detections: BallDetection[];
  trajectories: number;
}

// Normalize RAILWAY_INFERENCE_URL (which may or may not already include /infer).
export function inferEndpoint(): string | null {
  let base = (process.env.RAILWAY_INFERENCE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return null;
  if (base.endsWith("/infer")) return base;
  return `${base}/infer`;
}
