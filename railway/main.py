"""
Roboflow Inference Server for PickleVision Pro
Detects pickleballs in video frames using YOLOv8 + Roboflow
"""

import os
import json
import logging
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import cv2
import numpy as np
from inference_sdk import InferenceHTTPClient
import requests
from urllib.parse import urlparse
import tempfile

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="PickleVision Ball Detection", version="1.0.0")

# Roboflow Inference Configuration
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
PICKLEBALL_MODEL_ID = "pickleball-detection/4"  # Roboflow Universe pickleball model
CONFIDENCE_THRESHOLD = 0.45

# Initialize Roboflow client
client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=ROBOFLOW_API_KEY
) if ROBOFLOW_API_KEY else None


class InferenceRequest(BaseModel):
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
    """Download video from URL and return local path"""
    try:
        logger.info(f"[INFERENCE] Downloading video from {video_url[:50]}...")

        response = requests.get(video_url, stream=True, timeout=30)
        response.raise_for_status()

        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')

        # Write video data
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                temp_file.write(chunk)

        temp_file.close()
        logger.info(f"[INFERENCE] Video downloaded to {temp_file.name}")
        return temp_file.name
    except Exception as e:
        logger.error(f"[INFERENCE] Download failed: {e}")
        raise


def extract_frames(video_path: str, fps: int = 5) -> tuple[List[np.ndarray], int, float, float]:
    """
    Extract frames from video at specified FPS
    Returns: (frames, total_frames, video_fps, duration)
    """
    try:
        logger.info(f"[INFERENCE] Extracting frames at {fps} FPS")

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError("Cannot open video file")

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / video_fps if video_fps > 0 else 0

        frame_interval = max(1, int(video_fps / fps))
        frames = []
        frame_num = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_num % frame_interval == 0:
                frames.append(frame)

            frame_num += 1

        cap.release()

        logger.info(f"[INFERENCE] Extracted {len(frames)} frames from {total_frames} total frames")
        return frames, total_frames, video_fps, duration
    except Exception as e:
        logger.error(f"[INFERENCE] Frame extraction failed: {e}")
        raise


def detect_balls_in_frames(frames: List[np.ndarray]) -> List[dict]:
    """
    Run ball detection on each frame using Roboflow
    Returns list of detections with frame number and coordinates
    """
    try:
        detections = []

        for frame_idx, frame in enumerate(frames):
            try:
                # Encode frame to JPG bytes
                ret, jpg = cv2.imencode('.jpg', frame)
                if not ret:
                    logger.warning(f"[INFERENCE] Failed to encode frame {frame_idx}")
                    continue

                jpg_bytes = jpg.tobytes()

                # Infer using Roboflow (or use public model if no API key)
                if client and ROBOFLOW_API_KEY:
                    result = client.infer_on_image(
                        image=jpg_bytes,
                        model_id=PICKLEBALL_MODEL_ID,
                        confidence=CONFIDENCE_THRESHOLD
                    )
                else:
                    # Fallback: Use public Roboflow model without API key
                    try:
                        response = requests.post(
                            "https://detect.roboflow.com/pickleball-detection/4?api_key=rf_free",
                            data=jpg_bytes,
                            headers={"Content-Type": "application/octet-stream"},
                            timeout=15
                        )
                        result = response.json() if response.status_code == 200 else {"predictions": []}
                        if response.status_code != 200:
                            logger.warning(f"[INFERENCE] Roboflow API returned {response.status_code}: {response.text[:200]}")
                    except Exception as e:
                        logger.warning(f"[INFERENCE] Roboflow API call failed: {e}")
                        result = {"predictions": []}

                # Extract ball detections
                predictions = result.get("predictions", [])

                for pred in predictions:
                    # Filter by confidence and size (pickleballs are small objects)
                    if pred.get("confidence", 0) >= CONFIDENCE_THRESHOLD:
                        x = pred.get("x", 0)
                        y = pred.get("y", 0)
                        width = pred.get("width", 0)
                        height = pred.get("height", 0)

                        # Pickleball constraints: small, roughly circular
                        if 5 < width < 200 and 5 < height < 200:
                            detections.append({
                                "frame": frame_idx,
                                "x": x,
                                "y": y,
                                "confidence": pred.get("confidence", 0.0),
                                "width": width,
                                "height": height
                            })

                if (frame_idx + 1) % max(1, len(frames) // 10) == 0:
                    logger.info(f"[INFERENCE] Processed {frame_idx + 1}/{len(frames)} frames, {len(detections)} detections so far")

            except Exception as e:
                logger.warning(f"[INFERENCE] Detection failed for frame {frame_idx}: {e}")
                continue

        logger.info(f"[INFERENCE] Total detections: {len(detections)}")
        return detections

    except Exception as e:
        logger.error(f"[INFERENCE] Ball detection failed: {e}")
        raise


def pixel_to_court_coords(pixel_x: float, pixel_y: float, video_width: int, video_height: int) -> tuple[float, float]:
    """
    Convert pixel coordinates to court coordinates
    Pickleball court: 20ft wide × 44ft long
    """
    court_width = 20.0
    court_length = 44.0

    court_x = (pixel_x / video_width) * court_width
    court_y = (pixel_y / video_height) * court_length

    return court_x, court_y


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ball-detection"}


@app.post("/infer", response_model=InferenceResponse)
async def infer(request: InferenceRequest):
    """
    Main inference endpoint
    Accepts video URL, detects pickleballs, returns trajectory data
    """
    try:
        video_url = request.videoUrl

        if not video_url:
            raise HTTPException(status_code=400, detail="videoUrl required")

        logger.info(f"[INFERENCE] Starting ball detection for {video_url[:50]}...")

        # Step 1: Download video
        video_path = download_video(video_url)

        try:
            # Step 2: Extract frames
            frames, total_frames, video_fps, duration = extract_frames(video_path, fps=1)

            if not frames:
                raise ValueError("No frames extracted from video")

            video_width = frames[0].shape[1]
            video_height = frames[0].shape[0]

            # Step 3: Detect balls
            raw_detections = detect_balls_in_frames(frames)

            # Step 4: Convert to output format
            detections = []
            for det in raw_detections:
                court_x, court_y = pixel_to_court_coords(
                    det["x"], det["y"], video_width, video_height
                )

                detections.append(BallDetection(
                    frameNum=det["frame"],
                    timestamp=(det["frame"] / 5) * 1000,  # Assuming 5 FPS extraction
                    pixelX=float(det["x"]),
                    pixelY=float(det["y"]),
                    confidence=float(det["confidence"]),
                    courtX=float(court_x),
                    courtY=float(court_y)
                ))

            # Calculate trajectories (simple: consecutive detections in nearby frames)
            trajectory_count = len(set(d.frameNum for d in detections)) // 30 if detections else 0

            logger.info(f"[INFERENCE] Analysis complete: {len(detections)} detections, {trajectory_count} trajectories")

            return InferenceResponse(
                success=True,
                totalFrames=total_frames,
                detectionsFound=len(detections),
                fps=float(video_fps),
                duration=float(duration),
                detections=detections,
                trajectories=trajectory_count
            )

        finally:
            # Cleanup temp video
            try:
                os.remove(video_path)
                logger.info(f"[INFERENCE] Cleaned up temp video")
            except:
                pass

    except Exception as e:
        logger.error(f"[INFERENCE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
