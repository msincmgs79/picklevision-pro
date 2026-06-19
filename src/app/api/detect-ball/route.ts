/**
 * Ball Detection API - YOLOv8 Integration
 * Extracts ball coordinates from video frames
 * Returns trajectory data with real pixel/court coordinates
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

interface BallDetection {
  frameNum: number;
  timestamp: number;
  pixelX: number;
  pixelY: number;
  confidence: number;
  courtX?: number;
  courtY?: number;
}

interface TrajectoryData {
  success: boolean;
  totalFrames: number;
  detectionsFound: number;
  fps: number;
  duration: number;
  detections: BallDetection[];
  trajectories: number;
}

/**
 * Extract frames from video at specified FPS
 */
async function extractFrames(
  videoPath: string,
  outputDir: string,
  fps: number = 5
): Promise<{ frameCount: number; videoFps: number; duration: number }> {
  console.log('[BALL_DETECT] Extracting frames at', fps, 'FPS');

  // Get video info first
  const { stdout: probeOutput } = await execPromise(
    `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  );

  const [frameRateNum, frameRateDen] = probeOutput.split('\n')[0].split('/');
  const videoFps = parseInt(frameRateNum) / (parseInt(frameRateDen) || 1);
  const duration = parseFloat(probeOutput.split('\n')[1]);

  // Extract frames
  await execPromise(
    `ffmpeg -i "${videoPath}" -vf "fps=${fps}" "${outputDir}/frame_%06d.png" -loglevel error`
  );

  const frameCount = fs.readdirSync(outputDir).filter((f) => f.endsWith('.png')).length;

  console.log('[BALL_DETECT]', frameCount, 'frames extracted, video FPS:', videoFps, 'duration:', duration);
  return { frameCount, videoFps, duration };
}

/**
 * Run YOLOv8 ball detection on frames
 * Python subprocess for ONNX inference
 */
async function detectBalls(framesDir: string): Promise<BallDetection[]> {
  console.log('[BALL_DETECT] Running YOLOv8 detection');

  // Python script for YOLOv8 detection
  const pythonScript = `
import os
import json
from pathlib import Path
from ultralytics import YOLO

frames_dir = "${framesDir}"
model = YOLO('yolov8n.pt')

detections = []
for i, frame_file in enumerate(sorted(os.listdir(frames_dir))):
    if not frame_file.endswith('.png'):
        continue

    frame_path = os.path.join(frames_dir, frame_file)
    results = model(frame_path, conf=0.5, verbose=False)

    if results and len(results) > 0:
        boxes = results[0].boxes
        for box in boxes:
            # Filter for small objects (ball size)
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            width = x2 - x1
            height = y2 - y1

            # Ball-like objects: roughly square, small
            if 5 < width < 200 and 5 < height < 200 and abs(width - height) < 50:
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                conf = box.conf.item()

                detections.append({
                    'frame': i,
                    'x': cx,
                    'y': cy,
                    'confidence': conf,
                    'width': width,
                    'height': height
                })

print(json.dumps(detections))
`;

  const scriptPath = '/tmp/detect_balls.py';
  fs.writeFileSync(scriptPath, pythonScript);

  try {
    const { stdout } = await execPromise(`python3 "${scriptPath}"`);
    const detections = JSON.parse(stdout);

    console.log('[BALL_DETECT] Found', detections.length, 'ball detections');
    return detections.map((d: any, idx: number) => ({
      frameNum: d.frame,
      timestamp: (d.frame / 30) * 1000, // Approximate at 30 FPS
      pixelX: d.x,
      pixelY: d.y,
      confidence: d.confidence,
    }));
  } catch (error) {
    console.error('[BALL_DETECT] YOLOv8 error:', error);
    throw new Error('Ball detection failed');
  }
}

/**
 * Reconstruct trajectories from detections
 */
function reconstructTrajectories(detections: BallDetection[], videoFps: number) {
  console.log('[BALL_DETECT] Reconstructing trajectories');

  const trajectories = [];
  let currentTrajectory: BallDetection[] = [];
  let lastFrameNum = -1;

  for (const detection of detections) {
    // If gap > 0.5 seconds, start new trajectory
    if (detection.frameNum - lastFrameNum > videoFps * 0.5) {
      if (currentTrajectory.length > 2) {
        trajectories.push(currentTrajectory);
      }
      currentTrajectory = [detection];
    } else {
      currentTrajectory.push(detection);
    }
    lastFrameNum = detection.frameNum;
  }

  if (currentTrajectory.length > 2) {
    trajectories.push(currentTrajectory);
  }

  console.log('[BALL_DETECT] Reconstructed', trajectories.length, 'trajectories');
  return trajectories;
}

/**
 * Convert pixel coordinates to court coordinates
 * Requires camera calibration (homography matrix)
 */
function pixelToCourtCoords(pixelX: number, pixelY: number, videoWidth: number, videoHeight: number) {
  // Placeholder: Simple linear mapping
  // In production, use proper camera calibration
  const courtWidth = 20; // feet
  const courtLength = 44; // feet

  const courtX = (pixelX / videoWidth) * courtWidth;
  const courtY = (pixelY / videoHeight) * courtLength;

  return { courtX, courtY };
}

export async function POST(request: Request) {
  try {
    const { videoUrl, videoPath } = await request.json();

    if (!videoUrl && !videoPath) {
      return Response.json(
        { success: false, error: 'videoUrl or videoPath required' },
        { status: 400 }
      );
    }

    const framesDir = '/tmp/ball_detection_frames';
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    // Extract frames
    const { frameCount, videoFps, duration } = await extractFrames(
      videoPath || videoUrl,
      framesDir,
      5 // Extract at 5 FPS
    );

    // Detect balls
    const detections = await detectBalls(framesDir);

    // Reconstruct trajectories
    const trajectories = reconstructTrajectories(detections, videoFps);

    // Convert to court coordinates
    const detectionsWithCourt = detections.map((d) => ({
      ...d,
      ...pixelToCourtCoords(d.pixelX, d.pixelY, 848, 396),
    }));

    const result: TrajectoryData = {
      success: true,
      totalFrames: frameCount,
      detectionsFound: detections.length,
      fps: videoFps,
      duration,
      detections: detectionsWithCourt,
      trajectories: trajectories.length,
    };

    console.log('[BALL_DETECT] Analysis complete:', result);
    return Response.json(result);
  } catch (error) {
    console.error('[BALL_DETECT] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Detection failed',
      },
      { status: 500 }
    );
  }
}
