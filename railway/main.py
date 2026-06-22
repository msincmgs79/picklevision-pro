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
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PickleVision Ball Detection", version="1.7.0")

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
SHOT_KEYFRAMES = 20                     # keyframes sent to Gemini
RATING_CALIBRATION = 0.4                 # added to each AI skill rating (user-calibrated)


class InferenceRequest(BaseModel):
    videoUrl: str
    # Optional court calibration: 4 image-pixel points in native video resolution,
    # ordered Top-Left, Top-Right, Bottom-Right, Bottom-Left of the court.
    corners: list | None = None


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
    inOut: str | None = None  # "in"/"out" when court calibration is provided


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

        # Court calibration: build a homography (image px -> court feet) if the
        # caller supplied 4 corners. Court is 20ft wide (X) x 44ft long (Y).
        H = None
        if request.corners and len(request.corners) == 4:
            try:
                src = np.array(request.corners, dtype=np.float32)
                dst = np.array([[0, 0], [20, 0], [20, 44], [0, 44]], dtype=np.float32)
                H = cv2.getPerspectiveTransform(src, dst)
            except Exception as e:
                logger.warning(f"[INFERENCE] bad corners, ignoring: {e}")
                H = None

        detections: List[BallDetection] = []
        for d in raw:
            in_out = None
            if H is not None:
                p = cv2.perspectiveTransform(
                    np.array([[[d["x"], d["y"]]]], dtype=np.float32), H
                )[0][0]
                cx, cy = float(p[0]), float(p[1])
                in_out = "in" if (-0.5 <= cx <= 20.5 and -0.5 <= cy <= 44.5) else "out"
            else:
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
                    inOut=in_out,
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


# ---------------- Dense ball tracking (Phase 2) ----------------
TRACK_MAX_FRAMES = 800
TRACK_MAX_WINDOW = 30.0
# Roboflow trained ball model (Phase 2.5). When the key is set, /track uses it
# instead of the color blob. Sampled + parallel to bound cost/latency.
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
ROBOFLOW_MODEL = os.getenv("ROBOFLOW_MODEL", "pickleball-detection/4")
ROBOFLOW_TARGET_FPS = 6
ROBOFLOW_MAX_FRAMES = 120
ROBOFLOW_WORKERS = 6
_HSV_LO = np.array([15, 100, 100])
_HSV_HI = np.array([45, 255, 255])
_KERNEL = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))


class TrackRequest(BaseModel):
    videoUrl: str
    corners: list | None = None
    startSec: float = 0.0
    windowSec: float = 20.0


def detect_best_ball(frame):
    """The single most ball-like yellow/green blob in a frame (for tracking)."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, _HSV_LO, _HSV_HI)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, _KERNEL)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, _KERNEL)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best, best_score = None, 0.0
    h, w = frame.shape[:2]
    for c in contours:
        area = cv2.contourArea(c)
        if area < 18 or area > 8000:
            continue
        (x, y), r = cv2.minEnclosingCircle(c)
        if r < 4:
            continue
        perim = cv2.arcLength(c, True)
        if perim <= 0:
            continue
        circ = (4 * np.pi * area) / (perim ** 2)
        if circ < 0.6:
            continue
        if circ > best_score:
            best_score = circ
            best = {"x": float(x), "y": float(y),
                    "conf": float(min(0.95, 0.7 + (circ - 0.6) * 0.5)), "w": w, "h": h}
    return best


def track_window(video_path, start_sec, window_sec):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start_sec) * 1000.0)
    end_ms = (start_sec + window_sec) * 1000.0
    pts, count = [], 0
    while count < TRACK_MAX_FRAMES:
        ok, frame = cap.read()
        if not ok:
            break
        t_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
        if t_ms > 0 and t_ms > end_ms:
            break
        b = detect_best_ball(frame)
        if b:
            pts.append({"t": t_ms / 1000.0, "x": b["x"], "y": b["y"],
                        "conf": b["conf"], "w": b["w"], "h": b["h"]})
        count += 1
    cap.release()
    return pts, count


def roboflow_infer(frame):
    """Detect the highest-confidence ball with the Roboflow model (raises on HTTP error)."""
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    url = f"https://detect.roboflow.com/{ROBOFLOW_MODEL}?api_key={ROBOFLOW_API_KEY}"
    r = requests.post(url, data=b64, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=25)
    if not r.ok:
        raise HTTPException(status_code=502, detail=f"Roboflow error {r.status_code}: {r.text[:200]}")
    preds = r.json().get("predictions", [])
    if not preds:
        return None
    best = max(preds, key=lambda p: p.get("confidence", 0))
    return {"x": float(best["x"]), "y": float(best["y"]), "conf": float(best.get("confidence", 0.5))}


def roboflow_infer_safe(frame):
    try:
        return roboflow_infer(frame)
    except HTTPException:
        raise
    except Exception:
        return None


def collect_window_frames(video_path, start_sec, window_sec,
                          target_fps=ROBOFLOW_TARGET_FPS, max_frames=ROBOFLOW_MAX_FRAMES):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start_sec) * 1000.0)
    end_ms = (start_sec + window_sec) * 1000.0
    step = max(1, int(round(fps / target_fps)))
    kept, idx = [], 0
    while len(kept) < max_frames:
        if not cap.grab():
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC)
        if t > 0 and t > end_ms:
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if ok and frame is not None:
                kept.append((t / 1000.0, frame))
        idx += 1
    cap.release()
    return kept


def track_window_roboflow(video_path, start_sec, window_sec):
    kept = collect_window_frames(video_path, start_sec, window_sec)
    if not kept:
        return [], 0
    # Validate key/model on the first frame (let auth/model errors surface).
    first = roboflow_infer(kept[0][1])
    rest = []
    if len(kept) > 1:
        with ThreadPoolExecutor(max_workers=ROBOFLOW_WORKERS) as ex:
            rest = list(ex.map(lambda fr: roboflow_infer_safe(fr), [k[1] for k in kept[1:]]))
    results = [first] + rest
    pts = []
    for (t, frame), r in zip(kept, results):
        if r:
            h, w = frame.shape[:2]
            pts.append({"t": t, "x": r["x"], "y": r["y"], "conf": r["conf"], "w": w, "h": h})
    return pts, len(kept)


@app.post("/track")
async def track(request: TrackRequest):
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")
    window = min(TRACK_MAX_WINDOW, max(2.0, float(request.windowSec or 20.0)))
    start = max(0.0, float(request.startSec or 0.0))

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        if ROBOFLOW_API_KEY:
            pts, scanned = track_window_roboflow(video_path, start, window)
            detector = "roboflow"
        else:
            pts, scanned = track_window(video_path, start, window)
            detector = "color"

        H = None
        if request.corners and len(request.corners) == 4:
            try:
                src = np.array(request.corners, dtype=np.float32)
                dst = np.array([[0, 0], [20, 0], [20, 44], [0, 44]], dtype=np.float32)
                H = cv2.getPerspectiveTransform(src, dst)
            except Exception:
                H = None

        mapped = []
        for p in pts:
            if H is not None:
                q = cv2.perspectiveTransform(np.array([[[p["x"], p["y"]]]], dtype=np.float32), H)[0][0]
                cx, cy = float(q[0]), float(q[1])
                io = "in" if (-0.5 <= cx <= 20.5 and -0.5 <= cy <= 44.5) else "out"
            else:
                cx, cy = (p["x"] / p["w"]) * 20.0, (p["y"] / p["h"]) * 44.0
                io = None
            mapped.append({"t": p["t"], "courtX": cx, "courtY": cy, "inOut": io})

        # group consecutive points into per-shot trajectories (gap-based)
        GAP, MINPTS = 0.5, 4
        trajs, cur = [], []
        for m in mapped:
            if cur and (m["t"] - cur[-1]["t"] > GAP):
                if len(cur) >= MINPTS:
                    trajs.append(cur)
                cur = []
            cur.append(m)
        if len(cur) >= MINPTS:
            trajs.append(cur)

        out = []
        for tr in trajs:
            traj_io = None
            if H is not None:
                traj_io = "out" if any(p["inOut"] == "out" for p in tr) else "in"
            out.append({
                "inOut": traj_io,
                "points": [{"t": round(p["t"], 2), "courtX": round(p["courtX"], 2),
                            "courtY": round(p["courtY"], 2), "inOut": p["inOut"]} for p in tr],
            })

        return {
            "success": True,
            "window": {"start": start, "seconds": window},
            "framesScanned": scanned,
            "pointsDetected": len(mapped),
            "calibrated": H is not None,
            "detector": detector,
            "trajectories": out,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TRACK] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Tracking failed: {e}")
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
    "Return a detailed coaching breakdown as STRICT JSON with this exact shape:\n"
    '{"summary": string,'
    ' "ratings": {"serve": number, "return": number, "offense": number, '
    '"defense": number, "consistency": number},'
    ' "kitchenControl": number,'
    ' "positioning": string,'
    ' "shotTypes": [{"type": string, "emphasis": string}],'
    ' "shotsObserved": [{"type": string, "note": string}],'
    ' "strengths": [string], "improvements": [string], "coachTip": string}\n'
    "ratings are AI ESTIMATES on the DUPR scale 2.0-8.0 (one decimal): about 3.0 "
    "is a beginner, 4.0 intermediate, 5.0 advanced, 6.0-8.0 elite/pro. Do NOT claim "
    "to be an official DUPR. kitchenControl is 0-100 (how consistently the "
    "player holds the non-volley-zone line). positioning is one sentence on court "
    "positioning and movement. shotTypes lists the shot types you actually see "
    "(serve, return, drive, drop, dink, volley, lob, smash) each with emphasis "
    '"High", "Medium" or "Low". shotsObserved cites specific frames. Keep arrays to '
    "3-6 short items. Frames are sparse, so give your best coaching estimate."
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

        # Calibration: nudge AI ratings to better match observed real-world level.
        ratings = analysis.get("ratings")
        if isinstance(ratings, dict):
            for k, v in list(ratings.items()):
                try:
                    ratings[k] = round(min(8.0, max(2.0, float(v) + RATING_CALIBRATION)), 1)
                except (TypeError, ValueError):
                    pass

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
