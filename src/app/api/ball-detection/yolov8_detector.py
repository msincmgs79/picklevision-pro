#!/usr/bin/env python3
"""
YOLOv8 Ball Detection Service
Detects pickleball in video frames and extracts trajectory coordinates
"""

import json
import sys
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed. Install with: pip install ultralytics")
    sys.exit(1)


class BallDetector:
    def __init__(self, model_name="yolov8n.pt"):
        """Initialize YOLOv8 model for ball detection"""
        self.model = YOLO(model_name)
        self.detections = []

    def extract_and_detect(self, video_path: str, fps: int = 5) -> Dict:
        """
        Extract frames from video and detect balls using YOLOv8

        Args:
            video_path: Path to video file
            fps: Frames per second to extract

        Returns:
            Dictionary with detections and metadata
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": f"Cannot open video: {video_path}"}

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / video_fps if video_fps > 0 else 0

        frame_interval = int(video_fps / fps) if fps > 0 else 1
        frame_count = 0
        detections = []

        print(f"[YOLOV8] Processing video: {total_frames} frames, {video_fps} FPS", file=sys.stderr)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval != 0:
                frame_count += 1
                continue

            try:
                # Run YOLOv8 detection
                results = self.model(frame, conf=0.3, verbose=False)

                if results and len(results) > 0:
                    boxes = results[0].boxes
                    h, w = frame.shape[:2]

                    for box in boxes:
                        # Extract bounding box
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        cx = (x1 + x2) / 2
                        cy = (y1 + y2) / 2
                        box_w = x2 - x1
                        box_h = y2 - y1
                        conf = float(box.conf.cpu().numpy()[0])
                        cls_id = int(box.cls.cpu().numpy()[0])

                        # Filter for ball-like objects (small, roughly square)
                        if 3 < box_w < 150 and 3 < box_h < 150:
                            aspect_ratio = box_w / (box_h + 1e-6)
                            if 0.6 < aspect_ratio < 1.4:  # Roughly square
                                detections.append({
                                    "frame": frame_count,
                                    "timestamp": frame_count / video_fps,
                                    "pixelX": float(cx),
                                    "pixelY": float(cy),
                                    "confidence": conf,
                                    "width": float(box_w),
                                    "height": float(box_h),
                                    "classId": cls_id
                                })

            except Exception as e:
                print(f"[YOLOV8] Detection error on frame {frame_count}: {e}", file=sys.stderr)

            frame_count += 1

        cap.release()

        print(f"[YOLOV8] Processed {frame_count} frames, found {len(detections)} detections", file=sys.stderr)

        return {
            "success": True,
            "totalFrames": frame_count,
            "videoFps": video_fps,
            "duration": duration,
            "extractedFrames": frame_count // frame_interval,
            "detectionsFound": len(detections),
            "detections": detections
        }

    def reconstruct_trajectories(self, detections: List[Dict], fps: float) -> List[List[Dict]]:
        """
        Reconstruct ball trajectories from frame detections
        Groups consecutive detections into trajectories (shots)
        """
        if not detections:
            return []

        trajectories = []
        current_trajectory = []
        last_frame = -1
        gap_threshold = fps * 0.5  # 500ms gap = new trajectory

        for detection in detections:
            frame_num = detection["frame"]

            # Start new trajectory if gap too large
            if frame_num - last_frame > gap_threshold:
                if len(current_trajectory) > 2:  # Minimum 3 frames for a trajectory
                    trajectories.append(current_trajectory)
                current_trajectory = [detection]
            else:
                current_trajectory.append(detection)

            last_frame = frame_num

        # Add last trajectory
        if len(current_trajectory) > 2:
            trajectories.append(current_trajectory)

        return trajectories

    def pixel_to_court_coords(self, pixel_x: float, pixel_y: float, video_width: int, video_height: int) -> Dict:
        """
        Convert pixel coordinates to court coordinates
        TODO: Implement proper camera calibration with homography matrix
        """
        # Pickleball court dimensions (feet)
        court_width = 20
        court_length = 44

        # Simple linear mapping (placeholder)
        court_x = (pixel_x / video_width) * court_width
        court_y = (pixel_y / video_height) * court_length

        return {
            "courtX": float(court_x),
            "courtY": float(court_y)
        }


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python yolov8_detector.py <video_path> [fps]")
        sys.exit(1)

    video_path = sys.argv[1]
    fps = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    detector = BallDetector()
    result = detector.extract_and_detect(video_path, fps)

    if "error" in result:
        print(json.dumps({"success": False, "error": result["error"]}))
        sys.exit(1)

    # Add court coordinates
    video_width = 848  # From video metadata
    video_height = 396
    for detection in result.get("detections", []):
        court_coords = detector.pixel_to_court_coords(
            detection["pixelX"],
            detection["pixelY"],
            video_width,
            video_height
        )
        detection.update(court_coords)

    # Reconstruct trajectories
    trajectories = detector.reconstruct_trajectories(
        result.get("detections", []),
        result.get("videoFps", 30)
    )
    result["trajectories"] = len(trajectories)
    result["trajectoryData"] = trajectories

    print(json.dumps(result))


if __name__ == "__main__":
    main()
