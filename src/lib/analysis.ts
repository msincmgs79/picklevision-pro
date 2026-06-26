// Client + server shared types and helpers for the inference backend
// (the FastAPI service on Railway: /infer = ball detection, /analyze-shots = Gemini).

export interface BallDetection {
  frameNum: number;
  timestamp: number;
  pixelX: number;
  pixelY: number;
  confidence: number;
  courtX: number; // 0..20 ft (court width)
  courtY: number; // 0..44 ft (court length)
  inOut?: "in" | "out" | null; // set when court calibration was provided
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

export interface TrajPoint {
  t: number;
  courtX: number;
  courtY: number;
  inOut?: string | null;
}
export interface Trajectory {
  inOut?: string | null;
  points: TrajPoint[];
}
export interface TrackResult {
  success: boolean;
  window: { start: number; seconds: number };
  framesScanned: number;
  pointsDetected: number;
  calibrated: boolean;
  detector?: string;
  fullVideo?: boolean;
  trajectories: Trajectory[];
}

export interface ShotAnalysis {
  summary: string;
  ratings: {
    serve: number;
    return: number;
    offense: number;
    defense: number;
    consistency: number;
  };
  kitchenControl?: number;
  positioning?: string;
  shotTypes?: { type: string; emphasis: string }[];
  shotsObserved: { type: string; note: string }[];
  strengths: string[];
  improvements: string[];
  coachTip: string;
}

export interface ShotAnalysisResult {
  success: boolean;
  model: string;
  framesAnalyzed: number;
  duration: number;
  analysis: ShotAnalysis;
}

// The most-recently-analyzed match, loaded server-side for the analysis screens.
export interface LatestAnalysis {
  matchId: string;
  title: string;
  team: string;
  opponent: string;
  recordedAt: string | null;
  ball: InferenceResult | null;
  shot: ShotAnalysisResult | null;
}

export interface ReviewBookmark {
  id: string;
  t: number;
  label: string | null;
}

// Everything the Video Review screen needs for the latest analyzed match.
export interface ReviewData extends LatestAnalysis {
  videoUrl: string | null;
  bookmarks: ReviewBookmark[];
}

export interface SkillRatings {
  serve: number;
  return: number;
  offense: number;
  defense: number;
  consistency: number;
}

// One analyzed game's rating, for the career rollup + trend.
export interface RatedGame {
  matchId: string;
  title: string;
  date: string | null; // recorded_at, else created_at
  overall: number; // mean of the 5 skill ratings for this game
  ratings: SkillRatings;
}

// Player's rating across all analyzed games. `overall`/`ratings` are
// recency-weighted (newer games count more); `games` is oldest -> newest.
export interface RatingsRollup {
  overall: number;
  ratings: SkillRatings;
  games: RatedGame[];
  count: number;
}

// Base URL of the Railway service, with any trailing slash or /infer stripped.
function baseUrl(raw: string): string | null {
  const b = raw.trim().replace(/\/+$/, "").replace(/\/infer$/, "");
  return b || null;
}

// Server-side (kept for the /api/analyze fallback route).
export function inferEndpoint(): string | null {
  const b = baseUrl(process.env.RAILWAY_INFERENCE_URL || "");
  return b ? `${b}/infer` : null;
}

// Browser-callable endpoints. NEXT_PUBLIC_ is inlined at build time so the
// browser can call the service directly (no serverless timeout).
export function inferEndpointPublic(): string | null {
  const b = baseUrl(process.env.NEXT_PUBLIC_RAILWAY_INFERENCE_URL || "");
  return b ? `${b}/infer` : null;
}

export function shotEndpointPublic(): string | null {
  const b = baseUrl(process.env.NEXT_PUBLIC_RAILWAY_INFERENCE_URL || "");
  return b ? `${b}/analyze-shots` : null;
}

export function trackEndpointPublic(): string | null {
  const b = baseUrl(process.env.NEXT_PUBLIC_RAILWAY_INFERENCE_URL || "");
  return b ? `${b}/track` : null;
}
