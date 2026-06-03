import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { writeFile, mkdir } from 'fs/promises';

/**
 * POST /api/upload-video
 *
 * Accepts a video file upload and saves it to a temp location
 * Returns the file path for the tracker to analyze
 *
 * Request: multipart/form-data with 'file' field
 * Response: { success: true, videoId: "id", filename: "name.mp4" }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp-uploads');
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (err) {
      console.warn('Could not create temp directory:', err);
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const tempPath = path.join(tempDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempPath, buffer);

    console.log(`[Upload] Video saved: ${tempPath}`);
    console.log(`[Upload] File size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);

    return NextResponse.json({
      success: true,
      videoId: timestamp.toString(),
      filename: file.name,
      size: buffer.length,
    });

  } catch (error: any) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload video',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
