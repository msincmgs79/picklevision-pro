#!/usr/bin/env python3
"""
Position-Based Player Tracker for PickleVision
Tracks players using YOLOv8 nano and assigns them to court zones
"""

import json
import sys
import argparse
import os
from typing import Dict, Any
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='[Player Tracker] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Check for required dependencies
MISSING_DEPS = []

try:
    import cv2
    logger.info("✓ OpenCV imported")
except ImportError:
    MISSING_DEPS.append("opencv-python")
    logger.error("✗ OpenCV not found")

try:
    from ultralytics import YOLO
    logger.info("✓ Ultralytics YOLO imported")
except ImportError:
    MISSING_DEPS.append("ultralytics")
    logger.error("✗ Ultralytics not found")

try:
    import torch
    logger.info("✓ PyTorch imported")
except ImportError:
    MISSING_DEPS.append("torch")
    logger.error("✗ PyTorch not found")

try:
    import numpy as np
    logger.info("✓ NumPy imported")
except ImportError:
    MISSING_DEPS.append("numpy")
    logger.error("✗ NumPy not found")

if MISSING_DEPS:
    logger.error(f"Missing dependencies: {', '.join(MISSING_DEPS)}")
    logger.error(f"Install with: pip install {' '.join(MISSING_DEPS)}")
    sys.exit(1)


class CourtZoneAssigner:
    """Assigns detected persons to court zones based on position"""

    def __init__(self, frame_width: int, frame_height: int):
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.mid_x = frame_width / 2
        self.mid_y = frame_height / 2

    def assign_zone(self, x_center: float, y_center: float) -> str:
        """
        Assign a person to a zone based on their center position
        P1: Front-Left (top-left)
        P2: Front-Right (top-right)
        P3: Back-Left (bottom-left)
        P4: Back-Right (bottom-right)
        """
        if x_center < self.mid_x:
            if y_center < self.mid_y:
                return "P1-Front-Left"
            else:
                return "P3-Back-Left"
        else:
            if y_center < self.mid_y:
                return "P2-Front-Right"
            else:
                return "P4-Back-Right"


class PlayerTracker:
    """Main player tracking engine"""

    def __init__(self, model_name: str = "yolov8n.pt"):
        logger.info(f"Initializing YOLO model: {model_name}")
        try:
            self.model = YOLO(model_name)
            # Use GPU if available, otherwise CPU
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            self.model.to(device)
            logger.info(f"✓ Model loaded: {model_name} (Device: {device})")
            if device == 'cuda':
                logger.info(f"✓ GPU ACCELERATION ENABLED - Using {torch.cuda.get_device_name(0)}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def process_video(self, video_path: str, max_frames: int = None) -> Dict[str, Any]:
        """Process a video file and track player positions"""
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        logger.info(f"Opening video: {video_path}")
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0

        logger.info(f"Video properties: {total_frames} frames, {fps} FPS, {width}x{height}, {duration:.2f}s")

        zone_assigner = CourtZoneAssigner(width, height)
        player_zones = {}
        frame_idx = 0
        processed_count = 0
        frame_skip = 10  # Process every 10th frame (10x speedup)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if max_frames and frame_idx >= max_frames:
                break

            # Only process every Nth frame
            if frame_idx % frame_skip == 0:
                try:
                    # Downscale frame for faster inference
                    small_width, small_height = 640, 360
                    small_frame = cv2.resize(frame, (small_width, small_height))
                    # Run detection on downscaled frame
                    results = self.model(small_frame, verbose=False, conf=0.35)
                    detections = results[0].boxes.data.cpu().numpy()

                    # Scale coordinates back to original frame size
                    scale_x = width / small_width
                    scale_y = height / small_height

                    for detection in detections:
                        x1, y1, x2, y2, conf, cls = detection
                        # Scale back to original frame coordinates
                        x1 = x1 * scale_x
                        x2 = x2 * scale_x
                        y1 = y1 * scale_y
                        y2 = y2 * scale_y
                        x_center = (x1 + x2) / 2
                        y_center = (y1 + y2) / 2

                        # Only track persons (class 0 in COCO)
                        if int(cls) == 0:
                            zone = zone_assigner.assign_zone(x_center, y_center)

                            if zone not in player_zones:
                                player_zones[zone] = {
                                    'detections': [],
                                    'frames': []
                                }

                            player_zones[zone]['detections'].append(float(conf))
                            player_zones[zone]['frames'].append(frame_idx)
                            processed_count += 1

                except Exception as e:
                    logger.warning(f"Frame {frame_idx} processing error: {e}")

            frame_idx += 1

            if frame_idx % max(1, total_frames // 20) == 0:  # Update every 5%
                progress = int(100 * frame_idx / total_frames) if total_frames > 0 else 0
                progress_msg = f"PROGRESS_UPDATE:{progress}"
                logger.info(progress_msg)
                print(progress_msg, flush=True)

        cap.release()
        logger.info(f"✓ Processing complete: {frame_idx} frames, {processed_count} detections")

        # Build player assignments from zone data
        # Assign 2 players based on diagonal zones
        players = {}
        zones_with_data = {z: d for z, d in player_zones.items() if d['detections']}
        
        if zones_with_data:
            # Simple assignment: 2 teams based on diagonal zones
            # Team 1: P1 + P4, Team 2: P2 + P3
            team1_zones = {z: d for z, d in zones_with_data.items() if z in ['P1-Front-Left', 'P4-Back-Right']}
            team2_zones = {z: d for z, d in zones_with_data.items() if z in ['P2-Front-Right', 'P3-Back-Left']}

            # Player 1 (Team 1)
            if team1_zones:
                primary_zone = max(team1_zones, key=lambda z: len(team1_zones[z]['detections']))
                players['player_1'] = {
                    'player_id': 'player_1',
                    'primary_zone': primary_zone,
                    'team': 'Team-1',
                    'avg_confidence': float(np.mean(team1_zones[primary_zone]['detections'])),
                    'total_detections': sum(len(d['detections']) for d in team1_zones.values()),
                    'zones_detected': list(team1_zones.keys())
                }

            # Player 2 (Team 2)
            if team2_zones:
                primary_zone = max(team2_zones, key=lambda z: len(team2_zones[z]['detections']))
                players['player_2'] = {
                    'player_id': 'player_2',
                    'primary_zone': primary_zone,
                    'team': 'Team-2',
                    'avg_confidence': float(np.mean(team2_zones[primary_zone]['detections'])),
                    'total_detections': sum(len(d['detections']) for d in team2_zones.values()),
                    'zones_detected': list(team2_zones.keys())
                }

            # Additional players from other zones
            player_num = 3
            for zone, data in zones_with_data.items():
                if zone not in [z for z in sum([list(team1_zones.keys()), list(team2_zones.keys())], [])]:
                    players[f'player_{player_num}'] = {
                        'player_id': f'player_{player_num}',
                        'primary_zone': zone,
                        'team': 'Team-1' if zone in ['P1-Front-Left', 'P4-Back-Right'] else 'Team-2',
                        'avg_confidence': float(np.mean(data['detections'])),
                        'total_detections': len(data['detections']),
                        'zones_detected': [zone]
                    }
                    player_num += 1

        # Zone stats
        zone_stats = {}
        for zone in ['P1-Front-Left', 'P2-Front-Right', 'P3-Back-Left', 'P4-Back-Right']:
            zone_stats[zone] = len(player_zones.get(zone, {}).get('detections', []))

        results = {
            'video_info': {
                'filename': os.path.basename(video_path),
                'path': video_path,
                'duration_seconds': float(duration),
                'total_frames': total_frames,
                'fps': float(fps),
                'width': width,
                'height': height
            },
            'players': players,
            'zones': zone_stats,
            'summary': {
                'total_players': len(players),
                'unique_zones': len([z for z in zone_stats.values() if z > 0]),
                'processing_status': 'complete'
            }
        }

        return results


def main():
    parser = argparse.ArgumentParser(description='Track players in a pickleball video')
    parser.add_argument('video_path', help='Path to video file')
    parser.add_argument('--output', '-o', help='Output JSON file path', default=None)
    parser.add_argument('--max-frames', type=int, help='Maximum frames to process', default=None)
    parser.add_argument('--model', default='yolov8n.pt', help='YOLO model to use')

    args = parser.parse_args()

    try:
        logge