import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(require('child_process').exec);

// Store progress in memory (key: videoPath, value: progress%)
const progressMap = new Map<string, number>();

/**
 * POST /api/track-players
 *
 * Analyzes a video file using the position-based player tracker
 * Returns player zone analytics and statistics
 *
 * Request body:
 * {
 *   "videoPath": "/path/to/video.mp4"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "video_info": {...},
 *     "players": {
 *       "player_1": { "primary_zone": "P1-Front-Left", ... },
 *       "player_2": { ... }
 *     },
 *     "zones": {...}
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPath } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: 'videoPath is required' },
        { status: 400 }
      );
    }

    // Verify video file exists
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: 'Video file not found', path: videoPath },
        { status: 404 }
      );
    }

    // Create temp directory for outputs
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create output file path
    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `tracker_${timestamp}.json`);

    // Python script should be in project root
    const pythonScript = path.join(process.cwd(), 'tracker_api.py');

    console.log(`[Player Tracker] Starting analysis`);
    console.log(`[Player Tracker] Video: ${videoPath}`);
    console.log(`[Player Tracker] CWD: ${process.cwd()}`);
    console.log(`[Player Tracker] Script: ${pythonScript}`);

    // Check if script exists
    if (!fs.existsSync(pythonScript)) {
      return NextResponse.json(
        {
          error: 'Tracker script not found',
          expected: pythonScript
        },
        { status: 500 }
      );
    }

    // Execute Python tracker with progress tracking
    const progressKey = videoPath;
    progressMap.set(progressKey, 0);

    try {
      await new Promise<void>((resolve, reject) => {
        const python = spawn('python', [pythonScript, videoPath, '--output', outputPath], {
          cwd: process.cwd(),
        });

        let lastOutput = '';

        python.stdout.on('data', (data) => {
          const output = data.toString();
          lastOutput += output;
          console.log('[Player Tracker]', output.trim());

          // Parse progress updates
          const progressMatch = output.match(/PROGRESS_UPDATE:(\d+)/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            progressMap.set(progressKey, progress);
            console.log(`[Player Tracker] Progress: ${progress}%`);
          }
        });

        python.stderr.on('data', (data) => {
          console.warn('[Player Tracker] Warning:', data.toString().trim());
        });

        python.on('close', (code) => {
          progressMap.delete(progressKey);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Python process exited with code ${code}`));
          }
        });

        python.on('error', (error) => {
          progressMap.delete(progressKey);
          reject(error);
        });
      });

    } catch (error: any) {
      console.error('[Player Tracker] Execution failed:', error.message);
      progressMap.delete(progressKey);
      return NextResponse.json(
        {
          error: 'Failed to run player tracking',
          details: error.message.substring(0, 200)
        },
        { status: 500 }
      );
    }

    // Read JSON results
    let results;
    try {
      if (!fs.existsSync(outputPath)) {
        return NextResponse.json(
          { error: 'Tracker did not produce o