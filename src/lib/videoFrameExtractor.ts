/**
 * Video Frame Extraction Service
 * Extracts key frames from video for analysis
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Extract frames from video file at specified intervals
 * Returns base64 encoded image frames
 */
export async function extractVideoFrames(
  videoPath: string,
  frameCount: number = 3
): Promise<string[]> {
  try {
    // Create temp directory for frames
    const tempDir = path.join(os.tmpdir(), `frames-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Use ffmpeg to extract frames
      // Calculate frame intervals
      const framePattern = path.join(tempDir, 'frame-%d.jpg');
      
      // Extract frames using ffmpeg (every Nth frame)
      const command = `ffmpeg -i "${videoPath}" -vf "fps=1/${frameCount}" "${framePattern}" 2>/dev/null`;
      
      try {
        execSync(command, { stdio: 'pipe' });
      } catch (error) {
        // FFmpeg might not be available, return empty array
        console.warn('FFmpeg not available for frame extraction');
        return [];
      }

      // Read extracted frames
      const frames: string[] = [];
      const files = fs.readdirSync(tempDir).sort();
      
      for (const file of files) {
        if (file.endsWith('.jpg')) {
          const filePath = path.join(tempDir, file);
          const imageBuffer = fs.readFileSync(filePath);
          const base64Image = imageBuffer.toString('base64');
          frames.push(base64Image);
        }
      }

      // Cleanup
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);

      return frames;
    } catch (error) {
      console.error('Error extracting frames:', error);
      return [];
    }
  } catch (error) {
    console.error('Frame extraction error:', error);
    return [];
  }
}

/**
 * Download video from URL and extract frames
 */
export async function extractFramesFromUrl(videoUrl: string, frameCount: number = 3): Promise<string[]> {
  try {
    const tempFile = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
    
    // Download video
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(buffer));

    // Extract frames
    const frames = await extractVideoFrames(tempFile, frameCount);

    // Cleanup
    fs.unlinkSync(tempFile);

    return frames;
  } catch (error) {
    console.error('Error extracting frames from URL:', error);
    return [];
  }
}
