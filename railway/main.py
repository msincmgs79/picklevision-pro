"""
Ball Detection Inference Server for PickleVision Pro
Color-based pickleball detection over evenly-sampled video frames.
Time- and memory-bounded so it can handle long videos on a small instance.
"""

import os
import json
import base64
import logging
import tempfile
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PickleVision Ball Detection", version="1.2.0")

# Allow the browser frontend to call this directly (avoids serverless timeouts).
# Open for now; can be restricted to the Vercel domain later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FRAMES = 150                       # frames we actually decode/analyze
DOWNLOAD_TIMEOUT = 120                 # seconds
MAX_DOWNLOAD_BYTES = 300 * 1024 * 1024  # 300 MB safety cap

# Gemini (shot breakdown). Key is set on Railway as GEMINI_API_KEY.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
SHOT_KEYFRAMES = 12                     # keyframes sent to Gemini


class InferenceRequest(BaseModel):
    videoUrl: str


class ShotAnalysisRequest(BaseModel):
    videoUrl: str


class BallDetection(BaseModel):
    frameNum: int
    timestamp: float
    pixelX: float
    pixelY: float
    confidence: float
    courtX: float
    courtY: float


class InferenceResponse(BaseModel):
    success: bool
    totalFrames: int
    detectionsFound: int
    fps: float
    duration: float
    detections: List[BallDetection]
    trajectories: int


def download_video(video_url: str) -> str:
    logger.info(f"[INFERENCE] Downloading video from {video_url[:60]}...")
    resp = requests.get(video_url, stream=True, timeout=DOWNLOAD_TIMEOUT)
    resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    total = 0
    for chunk in resp.iter_content(chunk_size=1 << 16):
        if not chunk:
            continue
        total += len(chunk)
        if total > MAX_DOWNLOAD_BYTES:
            tmp.close()
            os.remove(tmp.name)
            raise ValueError("Video exceeds the size limit")
        tmp.write(chunk)
    tmp.close()
    logger.info(f"[INFERENCE] Downloaded {total / 1e6:.1f} MB -> {tmp.name}")
    return tmp.name


def sample_frames(
    video_path: str, max_frames: int = MAX_FRAMES
) -> Tuple[List[Tuple[int, np.ndarray]], int, float, float]:
    """
    Evenly sample up to max_frames across the whole video.
    Uses grab() (cheap, no decode) to skip frames and retrieve() only on kept
    frames, so a 12-minute video costs ~max_frames decodes instead of ~22,000.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frames: List[Tuple[int, np.ndarray]] = []

    step = max(1, total_frames // max_frames) if total_frames > 0 else max(1, int(video_fps))
    idx = 0
    while len(frames) < max_frames:
        if not cap.grab():
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if ok and frame is not None:
                frames.append((idx, frame))
        idx += 1

    if total_frames <= 0:
        total_frames = idx
    duration = total_frames / video_fps if video_fps > 0 else 0.0

    cap.release()
    logger.info(f"[INFERENCE] Sampled {len(frames)} frames from {total_frames} total")
    return frames, total_frames, video_fps, duration


def detect_balls(frames: List[Tuple[int, np.ndarray]]) -> List[dict]:
    """Color-based pickleball detection (bright yellow/green circular blobs)."""
    detections: List[dict] = []
    lower = np.array([15, 100, 100])
    upper = np.array([45, 255, 255])
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    for frame_idx, frame in frames:
        try:
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            mask = cv2.inRange(hsv, lower, upper)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            h, w = frame.shape[:2]
            for c in contours:
                area = cv2.contourArea(c)
                if area < 20 or area > 10000:
                    continue
                (x, y), radius = cv2.minEnclosingCircle(c)
                if radius < 5:
                    continue
                perim = cv2.arcLength(c, True)
                if perim <= 0:
                    continue
                circularity = (4 * np.pi * area) / (perim ** 2)
                if circularity < 0.6:
                    continue
                confidence = min(0.95, 0.7 + (circularity - 0.6) * 0.5)
                detections.append(
                    {"frame": frame_idx, "x": float(x), "y": float(y),
                     "confidence": float(confidence), "w": int(w), "h": int(h)}
                )
        except Exception as e:
            logger.warning(f"[INFERENCE] frame {frame_idx} failed: {e}")

    logger.info(f"[INFERENCE] {len(detections)} detections")
    return detections


def to_court(px: float, py: float, vw: int, vh: int) -> Tuple[float, float]:
    """Naive pixel -> court mapping (court is 20ft wide x 44ft long)."""
    return (px / vw) * 20.0, (py / vh) * 44.0


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ball-detection"}


@app.post("/infer", response_model=InferenceResponse)
async def infer(request: InferenceRequest):
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        frames, total_frames, video_fps, duration = sample_frames(video_path)
        if not frames:
            raise ValueError("No frames could be extracted from the video")

        raw = detect_balls(frames)
        detections: List[BallDetection] = []
        for d in raw:
            cx, cy = to_court(d["x"], d["y"], d["w"], d["h"])
            detections.append(
                BallDetection(
                    frameNum=d["frame"],
                    timestamp=float(d["frame"] / video_fps) if video_fps > 0 else 0.0,
                    pixelX=d["x"],
                    pixelY=d["y"],
                    confidence=d["confidence"],
                    courtX=float(cx),
                    courtY=float(cy),
                )
            )

        traj = len(set(d.frameNum for d in detections)) // 10 if detections else 0
        return InferenceResponse(
            success=True,
            totalFrames=total_frames,
            detectionsFound=len(detections),
            fps=float(video_fps),
            duration=float(duration),
            detections=detections,
            trajectories=traj,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INFERENCE] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        if video_path:
            try:
                os.remove(video_path)
            except OSError:
                pass


SHOT_PROMPT = (
    "You are a professional pickleball coach. The images are still frames sampled "
    "evenly and in chronological order from a single match video. Judge ONLY from "
    "what is visible (player positions, paddle prep, court coverage, shot context). "
    "Return a concise coaching breakdown as STRICT JSON with this exact shape:\n"
    '{"summary": string,'
    ' "ratings": {"serve": number, "return": number, "offense": number, '
    '"defense": number, "consistency": number},'
    ' "shotsObserved": [{"type": string, "note": string}],'
    ' "strengths": [string], "improvements": [string], "coachTip": string}\n'
    "Ratings are 0-5 with one decimal. Keep arrays to 2-4 short items each. "
    "These are sparse frames, so give your best coaching estimate."
)


def gemini_breakdown(frames: List[Tuple[int, np.ndarray]]) -> dict:
    parts = []
    for _idx, frame in frames:
        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        if ok:
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(buf.tobytes()).decode("ascii"),
                }
            })
    if not parts:
        raise ValueError("No frames to send to Gemini")
    parts.append({"text": SHOT_PROMPT})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    r = requests.post(
        url,
        headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
        json=body,
        timeout=120,
    )
    if not r.ok:
        raise HTTPException(status_code=502, detail=f"Gemini error {r.status_code}: {r.text[:300]}")
    data = r.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail=f"Gemini returned no content: {str(data)[:300]}")
    return json.loads(text)


@app.post("/analyze-shots")
async def analyze_shots(request: ShotAnalysisRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured on the backend")
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        frames, total_frames, video_fps, duration = sample_frames(video_path, max_frames=SHOT_KEYFRAMES)
        if not frames:
            raise ValueError("No frames could be extracted from the video")

        analysis = gemini_breakdown(frames)
        return {
            "success": True,
            "model": GEMINI_MODEL,
            "framesAnalyzed": len(frames),
            "duration": float(duration),
            "analysis": analysis,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SHOTS] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Shot analysis failed: {e}")
    finally:
        if video_path:
            try:
                os.remove(video_path)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
