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

function normalize(base: string): string | null {
  base = base.trim().replace(/\/+$/, "");
  if (!base) return null;
  return base.endsWith("/infer") ? base : `${base}/infer`;
}

// Server-side endpoint (Vercel route) — kept as a fallback.
export function inferEndpoint(): string | null {
  return normalize(process.env.RAILWAY_INFERENCE_URL || "");
}

// Browser-callable endpoint. NEXT_PUBLIC_ vars are inlined at build time so the
// browser can call the inference service directly (no serverless timeout).
export function inferEndpointPublic(): string | null {
  return normalize(process.env.NEXT_PUBLIC_RAILWAY_INFERENCE_URL || "");
}
