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
import subprocess
import shutil
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
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

MAX_FRAMES = int(os.getenv("MAX_FRAMES", "450"))  # frames /infer decodes/analyzes across the video (env-tunable; 150 was tuned for the old fast colour blob, v1 can afford denser sampling)
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


class SelfTestRequest(BaseModel):
    imageB64: str | None = None
    videoUrl: str | None = None


@app.post("/selftest")
async def selftest(request: SelfTestRequest):
    """Debug: run the local v1 model on a supplied frame (base64 JPEG) or a few
    frames of a videoUrl, on the SERVER, and report versions, frame dims, raw box
    counts and any traceback. Isolates 'server inference broken' vs 'video-specific'."""
    import sys as _sys, traceback as _tb
    info = {"python": _sys.version.split()[0], "use_local_model": USE_LOCAL_MODEL,
            "imgsz": LOCAL_IMGSZ, "conf": LOCAL_CONF, "model_path": LOCAL_MODEL_PATH,
            "model_exists": os.path.exists(LOCAL_MODEL_PATH)}
    try:
        import torch as _t, numpy as _np, cv2 as _cv, ultralytics as _u
        info.update({"torch": _t.__version__, "numpy": _np.__version__,
                     "opencv": _cv.__version__, "ultralytics": _u.__version__})
    except Exception as e:
        info["import_error"] = str(e)
    try:
        model = _get_local_model()
    except Exception as e:
        return {"stage": "model_load", "error": str(e), "trace": _tb.format_exc(), "info": info}
    frames = []
    try:
        if request.imageB64:
            arr = np.frombuffer(base64.b64decode(request.imageB64), np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                frames = [img]
        elif request.videoUrl:
            vp = download_video(request.videoUrl)
            fr, total, fps, dur = sample_frames(vp, max_frames=8)
            info["video_total_frames"] = total
            frames = [f for _, f in fr]
            try:
                os.remove(vp)
            except OSError:
                pass
    except Exception as e:
        return {"stage": "frames", "error": str(e), "trace": _tb.format_exc(), "info": info}
    results = []
    try:
        for img in frames:
            h, w = img.shape[:2]
            res = model.predict(img, imgsz=LOCAL_IMGSZ, conf=LOCAL_CONF, device="cpu", verbose=False)[0]
            boxes = [{"conf": round(float(b.conf[0]), 3),
                      "area": int((float(b.xyxy[0][2]) - float(b.xyxy[0][0])) *
                                  (float(b.xyxy[0][3]) - float(b.xyxy[0][1])))} for b in res.boxes]
            results.append({"shape": [w, h], "num_boxes": len(res.boxes), "boxes": boxes[:6]})
    except Exception as e:
        return {"stage": "predict", "error": str(e), "trace": _tb.format_exc(), "info": info, "partial": results}
    return {"info": info, "frames": len(frames), "results": results}


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

        if USE_LOCAL_MODEL:
            try:
                raw = detect_balls_local(frames)
            except Exception as e:
                logger.warning(f"[INFERENCE] local model failed, falling back to colour: {e}")
                raw = detect_balls(frames)
        else:
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
# Full-video tracking: bounded sampling across the whole clip for a game-wide map.
FULL_MAX_FRAMES = int(os.getenv("FULL_MAX_FRAMES", "900"))
FULL_TARGET_FPS = float(os.getenv("FULL_FPS", "2"))
FULL_WORKERS = int(os.getenv("FULL_WORKERS", "8"))
# Roboflow trained ball model (Phase 2.5). When the key is set, /track uses it
# instead of the color blob. Sampled + parallel to bound cost/latency.
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
ROBOFLOW_MODEL = os.getenv("ROBOFLOW_MODEL", "pickleball-detection/4")
# Credit-conservative defaults (free Roboflow plan has limited inference credits).
# Tunable via env without a code change.
ROBOFLOW_TARGET_FPS = float(os.getenv("ROBOFLOW_FPS", "3"))
ROBOFLOW_MAX_FRAMES = int(os.getenv("ROBOFLOW_MAX_FRAMES", "40"))
ROBOFLOW_WORKERS = int(os.getenv("ROBOFLOW_WORKERS", "5"))
_HSV_LO = np.array([15, 100, 100])
_HSV_HI = np.array([45, 255, 255])
_KERNEL = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))


class TrackRequest(BaseModel):
    videoUrl: str
    corners: list | None = None
    startSec: float = 0.0
    windowSec: float = 20.0
    fullVideo: bool = False


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


def person_infer(frame):
    """Detect every PERSON in the frame with a COCO model. Returns each player's
    foot point (bottom-centre of the box, which sits on the court) + box height
    (used later to tell the near side from the far side)."""
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    url = f"https://detect.roboflow.com/{ROBOFLOW_PERSON_MODEL}?api_key={ROBOFLOW_API_KEY}"
    r = requests.post(url, data=b64, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=25)
    if not r.ok:
        raise HTTPException(status_code=502, detail=f"Roboflow person error {r.status_code}: {r.text[:200]}")
    out = []
    for p in r.json().get("predictions", []):
        if str(p.get("class", "")).lower() != "person":
            continue
        if float(p.get("confidence", 0)) < PLAYERS_CONF_MIN:
            continue
        # Roboflow boxes: x,y = centre; width/height = full size. Foot = bottom-centre.
        fx = float(p["x"])
        fy = float(p["y"]) + float(p["height"]) / 2.0
        out.append({"fx": fx, "fy": fy, "boxh": float(p["height"]), "conf": float(p["confidence"])})
    return out


def person_infer_safe(frame):
    try:
        return person_infer(frame)
    except HTTPException:
        raise
    except Exception:
        return []


def track_players(video_path, H, target_fps, max_frames, workers=FULL_WORKERS):
    """Memory-bounded sweep collecting every on-court player foot position, mapped
    to court feet via the homography. Mirrors track_full's streaming (one batch in
    RAM at a time)."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps / max(0.1, target_fps))))
    samples, scanned, idx, batch = [], 0, 0, []
    bsize = max(1, workers * 3)

    def flush():
        if not batch:
            return
        with ThreadPoolExecutor(max_workers=workers) as ex:
            results = list(ex.map(lambda tf: person_infer_safe(tf[1]), batch))
        for (t, _frame), persons in zip(batch, results):
            for p in persons:
                q = cv2.perspectiveTransform(np.array([[[p["fx"], p["fy"]]]], dtype=np.float32), H)[0][0]
                cx, cy = float(q[0]), float(q[1])
                if _court_dist_outside(cx, cy) <= PLAYERS_OFFCOURT_MAX:
                    samples.append({"t": t, "cx": cx, "cy": cy, "boxh": p["boxh"]})
        batch.clear()

    while scanned < max_frames:
        if not cap.grab():
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if ok and frame is not None:
                batch.append((cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0, frame))
                scanned += 1
                if len(batch) >= bsize:
                    flush()
        idx += 1
    flush()
    cap.release()
    return samples, scanned


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


def track_window_roboflow(video_path, start_sec, window_sec,
                          target_fps=ROBOFLOW_TARGET_FPS, max_frames=ROBOFLOW_MAX_FRAMES):
    kept = collect_window_frames(video_path, start_sec, window_sec, target_fps, max_frames)
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


# --- Self-hosted fine-tuned model (v1 yolo11s). When USE_LOCAL_MODEL=1 and the
# weights are present, /track runs detection IN-PROCESS on Railway's CPU — no
# Roboflow calls, no credits. Lazy-loaded on first use so the container starts
# light (and app-sleeping only pays for memory while actually detecting). All
# knobs are env-driven so latency/accuracy can be tuned without a code change. ---
USE_LOCAL_MODEL = os.getenv("USE_LOCAL_MODEL", "0") == "1"
LOCAL_MODEL_PATH = os.getenv("LOCAL_MODEL_PATH", "models/best.pt")
LOCAL_IMGSZ = int(os.getenv("LOCAL_IMGSZ", "1280"))     # 1280 = best recall (75%); lower = faster
LOCAL_CONF = float(os.getenv("LOCAL_CONF", "0.20"))
LOCAL_MAX_AREA = int(os.getenv("LOCAL_MAX_AREA", "4000"))  # px^2; reject blobs too big to be a ball
_LOCAL_YOLO = None


def _get_local_model():
    global _LOCAL_YOLO
    if _LOCAL_YOLO is None:
        from ultralytics import YOLO  # lazy import so torch only loads on first detection
        _LOCAL_YOLO = YOLO(LOCAL_MODEL_PATH)
        logger.info(f"[TRACK] local model loaded: {LOCAL_MODEL_PATH} imgsz={LOCAL_IMGSZ} conf={LOCAL_CONF}")
    return _LOCAL_YOLO


def yolo_infer(frame):
    """Highest-confidence ball via the local fine-tuned model. Same return shape as
    roboflow_infer: {x, y, conf} (center px) or None. Raises on load/predict error."""
    model = _get_local_model()
    res = model.predict(frame, imgsz=LOCAL_IMGSZ, conf=LOCAL_CONF, device="cpu", verbose=False)[0]
    best = None
    for b in res.boxes:
        x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
        if (x2 - x1) * (y2 - y1) > LOCAL_MAX_AREA:
            continue
        c = float(b.conf[0])
        if best is None or c > best[2]:
            best = ((x1 + x2) / 2.0, (y1 + y2) / 2.0, c)
    return None if best is None else {"x": best[0], "y": best[1], "conf": best[2]}


def yolo_infer_safe(frame):
    try:
        return yolo_infer(frame)
    except Exception:
        return None


def detect_balls_local(frames):
    """Ball detection for /infer with the fine-tuned v1 model — one best ball per
    frame. Same dict shape as detect_balls() so /infer is a drop-in swap. Serial
    (torch already uses every CPU core per frame). Cleaner than the colour blob
    detector: real ball, high confidence, far fewer false positives."""
    _get_local_model()  # surface load errors up-front so /infer can fall back
    out = []
    for frame_idx, frame in frames:
        r = yolo_infer_safe(frame)
        if r:
            h, w = frame.shape[:2]
            out.append({"frame": frame_idx, "x": r["x"], "y": r["y"],
                        "confidence": r["conf"], "w": int(w), "h": int(h)})
    return out


def track_window_local(video_path, start_sec, window_sec,
                       target_fps=ROBOFLOW_TARGET_FPS, max_frames=ROBOFLOW_MAX_FRAMES):
    """Windowed tracking with the local model. Serial (one model instance, no thread
    pool) — torch already uses every CPU core per frame, so threads add contention,
    not speed, and keep the single YOLO instance thread-safe."""
    kept = collect_window_frames(video_path, start_sec, window_sec, target_fps, max_frames)
    if not kept:
        return [], 0
    _get_local_model()  # surface load errors up-front so /track can fall back cleanly
    pts = []
    for t, frame in kept:
        r = yolo_infer_safe(frame)
        if r:
            h, w = frame.shape[:2]
            pts.append({"t": t, "x": r["x"], "y": r["y"], "conf": r["conf"], "w": w, "h": h})
    return pts, len(kept)


def video_duration(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    n = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    cap.release()
    return float(n) / float(fps) if fps else 0.0


def _read_first_frame(video_path):
    cap = cv2.VideoCapture(video_path)
    ok, fr = cap.read()
    cap.release()
    return fr if ok else None


def track_full(video_path, infer_fn, target_fps, max_frames, workers=FULL_WORKERS):
    """Memory-bounded full-video tracking. Walks the clip sequentially (cheap grab,
    decode only every Nth frame), runs detection on small parallel batches, and keeps
    ONLY the result points — never the frames. Caps RAM at one batch regardless of
    video length (the previous collect-all approach OOM-killed the container)."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps / max(0.1, target_fps))))
    pts, scanned, idx, batch = [], 0, 0, []
    bsize = max(1, workers * 3)

    def flush():
        if not batch:
            return
        if workers <= 1:
            # Local model path: run serially in-process (torch already uses every
            # CPU core per frame). Matches /infer's working detect_balls_local and
            # avoids driving one YOLO instance from a worker thread.
            results = [infer_fn(tf[1]) for tf in batch]
        else:
            with ThreadPoolExecutor(max_workers=workers) as ex:
                results = list(ex.map(lambda tf: infer_fn(tf[1]), batch))
        for (t, frame), r in zip(batch, results):
            if r:
                h, w = frame.shape[:2]
                pts.append({"t": t, "x": r["x"], "y": r["y"], "conf": r["conf"], "w": w, "h": h})
        batch.clear()

    while scanned < max_frames:
        if not cap.grab():
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if ok and frame is not None:
                batch.append((cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0, frame))
                scanned += 1
                if len(batch) >= bsize:
                    flush()
        idx += 1
    flush()
    cap.release()
    return pts, scanned


# In/out cleanup (Phase 1): a flat-ground homography only locates the ball
# correctly when it is ON the court surface. Airborne balls (and false detections)
# project far outside the lines, so we (a) drop wild outliers + the weakest
# detections and (b) judge a rally's in/out at its most-grounded point rather than
# flipping to "out" the instant any single airborne point reads out.
INOUT_CONF_MIN = 0.20       # drop the weakest detections
INOUT_OFFCOURT_MAX = 18.0   # ft beyond the lines past which a point is noise/airborne
INOUT_MARGIN = 1.0          # ft line-call tolerance

# Player tracking (Phase A): person detection via a public COCO model, feet mapped
# to the court. Players' feet ARE on the ground, so the homography is accurate here
# (unlike the airborne ball). Configurable so the COCO model/version can be swapped.
ROBOFLOW_PERSON_MODEL = os.getenv("ROBOFLOW_PERSON_MODEL", "coco/50")  # Microsoft public COCO
PLAYERS_MAX_FRAMES = 500
PLAYERS_TARGET_FPS = 1.5
PLAYERS_OFFCOURT_MAX = 7.0  # ft beyond lines kept as an on-court player (drops spectators/bench)
PLAYERS_CONF_MIN = 0.35
NVZ_FT = 7.0                # non-volley zone depth each side of the net (kitchen)


def _court_dist_outside(cx: float, cy: float) -> float:
    """Distance (ft) a court point lies outside the 20x44 court; 0 if inside."""
    dx = max(0.0, 0.0 - cx, cx - 20.0)
    dy = max(0.0, 0.0 - cy, cy - 44.0)
    return (dx * dx + dy * dy) ** 0.5


@app.post("/track")
async def track(request: TrackRequest):
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")
    full = bool(request.fullVideo)
    start = 0.0 if full else max(0.0, float(request.startSec or 0.0))

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        detector = "color"
        if full:
            dur = video_duration(video_path)
            window = dur + 1.0
            t_fps = min(FULL_TARGET_FPS, FULL_MAX_FRAMES / max(1.0, dur))
            if USE_LOCAL_MODEL:
                try:
                    pts, scanned = track_full(video_path, yolo_infer_safe, t_fps, FULL_MAX_FRAMES, workers=1)
                    detector = "local"
                except Exception as e:
                    logger.warning(f"[TRACK] local model failed, falling back to color: {e}")
                    pts, scanned = track_full(video_path, detect_best_ball, t_fps, FULL_MAX_FRAMES)
                    detector = "color (local unavailable)"
            elif ROBOFLOW_API_KEY:
                try:
                    fr0 = _read_first_frame(video_path)
                    if fr0 is not None:
                        roboflow_infer(fr0)  # surface auth/model errors -> fall back
                    pts, scanned = track_full(video_path, roboflow_infer_safe, t_fps, FULL_MAX_FRAMES)
                    detector = "roboflow"
                except Exception as e:
                    logger.warning(f"[TRACK] Roboflow unavailable, falling back to color: {e}")
                    pts, scanned = track_full(video_path, detect_best_ball, t_fps, FULL_MAX_FRAMES)
                    detector = "color (roboflow unavailable)"
            else:
                pts, scanned = track_full(video_path, detect_best_ball, t_fps, FULL_MAX_FRAMES)
        else:
            window = min(TRACK_MAX_WINDOW, max(2.0, float(request.windowSec or 20.0)))
            t_fps = ROBOFLOW_TARGET_FPS
            if USE_LOCAL_MODEL:
                try:
                    pts, scanned = track_window_local(video_path, start, window)
                    detector = "local"
                except Exception as e:
                    logger.warning(f"[TRACK] local model failed, falling back to color: {e}")
                    pts, scanned = track_window(video_path, start, window)
                    detector = "color (local unavailable)"
            elif ROBOFLOW_API_KEY:
                try:
                    pts, scanned = track_window_roboflow(video_path, start, window)
                    detector = "roboflow"
                except Exception as e:
                    # Key set but model not trained/accessible yet — don't break tracking.
                    logger.warning(f"[TRACK] Roboflow unavailable, falling back to color: {e}")
                    pts, scanned = track_window(video_path, start, window)
                    detector = "color (roboflow unavailable)"
            else:
                pts, scanned = track_window(video_path, start, window)

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
            conf = float(p.get("conf", 0.5))
            if H is not None:
                q = cv2.perspectiveTransform(np.array([[[p["x"], p["y"]]]], dtype=np.float32), H)[0][0]
                cx, cy = float(q[0]), float(q[1])
                dist = _court_dist_outside(cx, cy)
                # Drop low-confidence detections and points thrown far off-court by
                # airborne parallax / false positives — they aren't real landings.
                if conf < INOUT_CONF_MIN or dist > INOUT_OFFCOURT_MAX:
                    continue
                io = "in" if dist <= INOUT_MARGIN else "out"
            else:
                if conf < INOUT_CONF_MIN:
                    continue
                cx, cy = (p["x"] / p["w"]) * 20.0, (p["y"] / p["h"]) * 44.0
                io = None
            mapped.append({"t": p["t"], "courtX": cx, "courtY": cy, "inOut": io})

        # group consecutive points into per-shot trajectories (gap-based).
        # Full-video sampling is sparser, so widen the gap and lower the min count
        # so each in-play rally becomes one trajectory instead of being discarded.
        if full:
            interval = 1.0 / max(0.1, t_fps)
            GAP, MINPTS = max(0.8, interval * 2.5), 2
        else:
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
            if H is not None and tr:
                # Judge the rally at its most-grounded point (closest to the court
                # surface), not "out the moment any airborne point reads out".
                landing = min(tr, key=lambda q: _court_dist_outside(q["courtX"], q["courtY"]))
                traj_io = "in" if _court_dist_outside(landing["courtX"], landing["courtY"]) <= INOUT_MARGIN else "out"
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
            "fullVideo": full,
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


class PlayersRequest(BaseModel):
    videoUrl: str
    corners: list | None = None


@app.post("/players")
async def players(request: PlayersRequest):
    """Player court-coverage: detect people, map feet to court, drop off-court
    bystanders, and summarise where players spent time (coverage heatmap + net
    presence per side). Requires court calibration."""
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")
    if not request.corners or len(request.corners) != 4:
        raise HTTPException(status_code=400, detail="Court calibration (4 corners) is required for player coverage.")
    if not ROBOFLOW_API_KEY:
        raise HTTPException(status_code=503, detail="Roboflow is not configured.")

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        try:
            src = np.array(request.corners, dtype=np.float32)
            dst = np.array([[0, 0], [20, 0], [20, 44], [0, 44]], dtype=np.float32)
            H = cv2.getPerspectiveTransform(src, dst)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Bad corners: {e}")

        dur = video_duration(video_path)
        t_fps = min(PLAYERS_TARGET_FPS, PLAYERS_MAX_FRAMES / max(1.0, dur))
        samples, scanned = track_players(video_path, H, t_fps, PLAYERS_MAX_FRAMES)

        # Coverage heatmap: court (20 wide x 44 long) binned into GW x GH cells.
        GW, GH = 10, 22
        grid = [[0] * GW for _ in range(GH)]
        for s in samples:
            gx = min(GW - 1, max(0, int(s["cx"] / 20.0 * GW)))
            gy = min(GH - 1, max(0, int(s["cy"] / 44.0 * GH)))
            grid[gy][gx] += 1

        # Split by net (cy 22). Label which half is "near" by larger avg box height
        # (players closer to the camera have bigger boxes).
        side_lo = [s for s in samples if s["cy"] < 22]   # court Y 0..22
        side_hi = [s for s in samples if s["cy"] >= 22]   # court Y 22..44
        avg = lambda xs: (sum(xs) / len(xs)) if xs else 0.0
        near_is_hi = avg([s["boxh"] for s in side_hi]) >= avg([s["boxh"] for s in side_lo])

        def side_stats(side):
            if not side:
                return {"samples": 0, "netPct": 0, "avgNetDist": 0.0}
            at_net = sum(1 for s in side if abs(s["cy"] - 22) <= NVZ_FT)
            return {
                "samples": len(side),
                "netPct": round(100 * at_net / len(side)),
                "avgNetDist": round(avg([abs(s["cy"] - 22) for s in side]), 1),
            }

        near = side_stats(side_hi if near_is_hi else side_lo)
        far = side_stats(side_lo if near_is_hi else side_hi)
        net_pct = round(100 * sum(1 for s in samples if abs(s["cy"] - 22) <= NVZ_FT) / len(samples)) if samples else 0

        return {
            "success": True,
            "framesScanned": scanned,
            "detections": len(samples),
            "grid": grid,
            "gw": GW,
            "gh": GH,
            "near": near,
            "far": far,
            "netPct": net_pct,
            "detector": "roboflow-coco",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PLAYERS] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Player tracking failed: {e}")
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


def gemini_breakdown(frames: List[Tuple[int, np.ndarray]], prompt: str = SHOT_PROMPT) -> dict:
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
    parts.append({"text": prompt})

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


# ---------------- Per-player breakdown (Phase 1) ----------------
# Position-based identity: doubles players mostly hold their side, so every
# on-court foot sample is bucketed into 4 slots (near/far x left/right) and each
# is rated. Left/right can flip on stacking/serve — approximate, not true re-ID.
PLAYER_PROMPT = (
    "You are a professional pickleball coach analysing still frames sampled in "
    "chronological order from ONE doubles match video (up to 4 players). Identify "
    "each DISTINCT player by appearance and court position and rate each ONE "
    "individually. Return STRICT JSON of this exact shape:\n"
    '{"players": [ {"appearance": string, "side": "near"|"far", '
    '"courtSide": "left"|"right", "ratings": {"serve": number, "return": number, '
    '"offense": number, "defense": number, "consistency": number}, '
    '"kitchenControl": number, "shotTypes": [{"type": string, "emphasis": string}], '
    '"strengths": [string], "improvements": [string], "coachNote": string, '
    '"unforcedErrors": {"estimate": number, "notes": [string]} } ] }\n'
    "appearance is a short visual description (e.g. 'blue shirt, black shorts'). "
    "side: 'near' = closer to the camera / larger in frame, 'far' = further away. "
    "courtSide is that player's left or right half from the camera's view. ratings "
    "are AI ESTIMATES on the DUPR scale 2.0-8.0 (one decimal: 3.0 beginner, 4.0 "
    "intermediate, 5.0 advanced, 6.0+ elite); do NOT claim to be an official DUPR. "
    "kitchenControl is 0-100. shotTypes lists the shots that player actually plays "
    "(serve/return/drive/drop/dink/volley/lob/smash) with emphasis 'High'/'Medium'/"
    "'Low'. unforcedErrors.estimate is your best ROUGH count of clear unforced "
    "errors attributable to that player from these sparse frames (0 if none seen), "
    "with 1-2 short notes; treat it as an estimate, not an exact tally. coachNote is "
    "ONE specific, actionable coaching sentence for that player. Return EXACTLY the "
    "players you can distinguish (2-4). Keep arrays to 2-4 short items."
)


def player_slots(samples):
    """Bucket on-court foot samples into 4 position slots (near/far x left/right)
    and summarise each: coverage grid, kitchen %, average net distance, movement."""
    if not samples:
        return []
    avg = lambda xs: (sum(xs) / len(xs)) if xs else 0.0
    lo = [s for s in samples if s["cy"] < 22]
    hi = [s for s in samples if s["cy"] >= 22]
    near_is_hi = avg([s["boxh"] for s in hi]) >= avg([s["boxh"] for s in lo])

    def side_of(s):
        return "near" if ((s["cy"] >= 22) == near_is_hi) else "far"

    GW, GH = 8, 11
    buckets = {}
    for s in samples:
        buckets.setdefault((side_of(s), "left" if s["cx"] < 10.0 else "right"), []).append(s)

    out = []
    for (side, lr), ss in buckets.items():
        ss = sorted(ss, key=lambda x: x["t"])
        grid = [[0] * GW for _ in range(GH)]
        for s in ss:
            gx = min(GW - 1, max(0, int(s["cx"] / 20.0 * GW)))
            gy = min(GH - 1, max(0, int(s["cy"] / 44.0 * GH)))
            grid[gy][gx] += 1
        at_net = sum(1 for s in ss if abs(s["cy"] - 22) <= NVZ_FT)
        move = sum(((a["cx"] - b["cx"]) ** 2 + (a["cy"] - b["cy"]) ** 2) ** 0.5
                   for a, b in zip(ss, ss[1:]))
        out.append({
            "slot": f"{side}-{lr}", "side": side, "lr": lr, "samples": len(ss),
            "netPct": round(100 * at_net / len(ss)) if ss else 0,
            "avgNetDist": round(avg([abs(s["cy"] - 22) for s in ss]), 1),
            "movementFt": round(move), "grid": grid, "gw": GW, "gh": GH,
        })
    order = {"near-left": 0, "near-right": 1, "far-left": 2, "far-right": 3}
    out.sort(key=lambda p: order.get(p["slot"], 9))
    return out


def merge_player_cards(slots, gplayers, names=None):
    """Attach each Gemini per-player read to the CV slot it best matches (by side,
    then left/right); rating = mean of the 5 skill estimates."""
    names = names or {}
    used, cards = set(), []
    for slot in slots:
        pick = next((i for i, g in enumerate(gplayers) if i not in used
                     and g.get("side") == slot["side"] and g.get("courtSide") == slot["lr"]), None)
        if pick is None:
            pick = next((i for i, g in enumerate(gplayers) if i not in used
                         and g.get("side") == slot["side"]), None)
        g = {}
        if pick is not None:
            used.add(pick); g = gplayers[pick]
        r = g.get("ratings", {}) or {}
        vals = [r[k] for k in ("serve", "return", "offense", "defense", "consistency")
                if isinstance(r.get(k), (int, float))]
        cards.append({
            "slot": slot["slot"], "side": slot["side"], "lr": slot["lr"],
            "name": names.get(slot["slot"], ""),
            "appearance": g.get("appearance", ""),
            "rating": round(sum(vals) / len(vals), 1) if vals else None,
            "ratings": r,
            "kitchenControl": g.get("kitchenControl"),
            "coverage": {"grid": slot["grid"], "gw": slot["gw"], "gh": slot["gh"]},
            "netPct": slot["netPct"], "avgNetDist": slot["avgNetDist"],
            "movementFt": slot["movementFt"], "samples": slot["samples"],
            "shotTypes": g.get("shotTypes", []) or [],
            "strengths": g.get("strengths", []) or [],
            "improvements": g.get("improvements", []) or [],
            "coachNote": g.get("coachNote", ""),
            "unforcedErrors": g.get("unforcedErrors") or {"estimate": None, "notes": []},
        })
    return cards


class PlayerBreakdownRequest(BaseModel):
    videoUrl: str
    corners: list | None = None
    playerNames: dict | None = None


@app.post("/player-breakdown")
async def player_breakdown(request: PlayerBreakdownRequest):
    """Per-player ratings: player-position tracking (4 slots) + a per-player Gemini
    coaching read, merged into one card per player. Requires calibration."""
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")
    if not request.corners or len(request.corners) != 4:
        raise HTTPException(status_code=400, detail="Court calibration (4 corners) is required.")
    if not ROBOFLOW_API_KEY:
        raise HTTPException(status_code=503, detail="Roboflow is not configured.")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    video_path = None
    try:
        video_path = download_video(request.videoUrl)
        try:
            src = np.array(request.corners, dtype=np.float32)
            dst = np.array([[0, 0], [20, 0], [20, 44], [0, 44]], dtype=np.float32)
            H = cv2.getPerspectiveTransform(src, dst)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Bad corners: {e}")

        dur = video_duration(video_path)
        t_fps = min(PLAYERS_TARGET_FPS, PLAYERS_MAX_FRAMES / max(1.0, dur))
        samples, scanned = track_players(video_path, H, t_fps, PLAYERS_MAX_FRAMES)
        slots = player_slots(samples)

        gframes, _t, _f, _d = sample_frames(video_path, max_frames=20)
        gplayers = []
        try:
            gb = gemini_breakdown(gframes, PLAYER_PROMPT)
            gplayers = gb.get("players", []) if isinstance(gb, dict) else []
        except Exception as e:
            logger.warning(f"[PLAYER-BREAKDOWN] Gemini failed: {e}")

        return {
            "success": True,
            "framesScanned": scanned,
            "detections": len(samples),
            "players": merge_player_cards(slots, gplayers, request.playerNames),
            "detector": "coco+gemini",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PLAYER-BREAKDOWN] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Player breakdown failed: {e}")
    finally:
        if video_path:
            try:
                os.remove(video_path)
            except OSError:
                pass


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


# ---- Highlight reel (Phase 5b): cut rally moments into one downloadable clip ----
REEL_MAX_SEGMENTS = 40      # bound the number of moments
REEL_MAX_SECONDS = 240      # bound total reel length
REEL_PAD = 0.6              # seconds of lead-in / tail around each moment
REEL_SEG_TIMEOUT = 90
REEL_CONCAT_TIMEOUT = 120


class ReelSegment(BaseModel):
    start: float
    end: float


class ReelRequest(BaseModel):
    videoUrl: str
    segments: List[ReelSegment] = []


@app.post("/reel")
async def reel(request: ReelRequest):
    """Cut the given moments from the match video and stitch them into one
    downloadable highlight clip (H.264, browser-safe). Video-only for now.

    Each moment is extracted separately with a fast input seek (only that window
    is decoded), then the clips are stream-concatenated — this keeps memory flat
    even for long source videos with widely-spread moments."""
    if not request.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")

    segs = []
    total = 0.0
    for s in request.segments:
        start = max(0.0, float(s.start) - REEL_PAD)
        dur = (float(s.end) + REEL_PAD) - start
        if dur <= 0.05:
            continue
        segs.append((start, dur))
        total += dur
        if len(segs) >= REEL_MAX_SEGMENTS or total >= REEL_MAX_SECONDS:
            break
    if not segs:
        raise HTTPException(status_code=400, detail="No valid moments to clip")

    video_path = None
    workdir = tempfile.mkdtemp(prefix="reel_")

    def cleanup():
        if video_path:
            try:
                os.remove(video_path)
            except OSError:
                pass
        shutil.rmtree(workdir, ignore_errors=True)

    try:
        video_path = download_video(request.videoUrl)

        seg_paths = []
        for i, (start, dur) in enumerate(segs):
            sp = os.path.join(workdir, f"seg_{i:03d}.mp4")
            cmd = [
                "ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", video_path, "-t", f"{dur:.3f}",
                "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", sp,
            ]
            r = subprocess.run(cmd, capture_output=True, timeout=REEL_SEG_TIMEOUT)
            if r.returncode == 0 and os.path.exists(sp) and os.path.getsize(sp) > 0:
                seg_paths.append(sp)
            else:
                logger.warning(f"[REEL] segment {i} skipped: {r.stderr.decode('utf-8', 'ignore')[-200:]}")

        if not seg_paths:
            cleanup()
            raise HTTPException(status_code=500, detail="Could not extract any clips from this video")

        list_path = os.path.join(workdir, "list.txt")
        with open(list_path, "w") as f:
            for sp in seg_paths:
                f.write(f"file '{sp}'\n")
        out_path = os.path.join(workdir, "highlights.mp4")
        cat = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
            "-c", "copy", "-movflags", "+faststart", out_path,
        ]
        rc = subprocess.run(cat, capture_output=True, timeout=REEL_CONCAT_TIMEOUT)
        if rc.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            logger.error(f"[REEL] concat failed: {rc.stderr.decode('utf-8', 'ignore')[-400:]}")
            cleanup()
            raise HTTPException(status_code=500, detail="Could not assemble the reel")

        logger.info(f"[REEL] {len(seg_paths)} clips -> {os.path.getsize(out_path) / 1e6:.1f} MB")
        return FileResponse(
            out_path,
            media_type="video/mp4",
            filename="picklevision-highlights.mp4",
            background=BackgroundTask(cleanup),
        )
    except HTTPException:
        cleanup()
        raise
    except subprocess.TimeoutExpired:
        cleanup()
        raise HTTPException(status_code=504, detail="The reel took too long to build")
    except Exception as e:
        cleanup()
        logger.error(f"[REEL] FATAL: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reel failed: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
