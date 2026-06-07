/**
 * Video Analysis API Endpoint
 *
 * Analyzes pickleball videos using Gemini API with Files API (resumable upload)
 *
 * Request body:
 * - videoUrl: URL to the video file (primary method)
 * - frameBase64: Base64-encoded image frame (fallback for images)
 * - userId: Firebase user ID (for saving analysis)
 * - videoId: Video ID (for saving analysis)
 *
 * Response: Pickleball performance metrics in JSON format
 */

import { saveVideoAnalysis } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';

interface AnalysisResult {
  success: boolean;
  kitchenTransition: { thirdShotSuccessRate: number; returnContactDepth: number };
  softGame: { deadDinksCount: number; unforcedErrorsCount: number };
  shotPlacement: { targetingAccuracy: number };
  hardGame: { speedUpEfficiency: number; forcedErrorsCaused: number };
  netDefense: { resetSuccessPercent: number; popUpFrequency: number };
  playerInsights: string[];
}

/**
 * Step 1: Initiate resumable upload session
 */
async function initiateUpload(filename: string, mimeType: string, fileSizeBytes: number): Promise<string> {
  console.log('[FILES_API] Initiating upload for:', filename);

  const response = await fetch(`${BASE_URL}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': fileSizeBytes.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: { display_name: filename },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload initiation failed: ${response.status} ${error}`);
  }

  const uploadUrl = response.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }

  return uploadUrl;
}

/**
 * Step 2: Upload file bytes and get file URI
 */
async function uploadFileBytes(
  uploadUrl: string,
  fileBytes: Buffer,
  mimeType: string
): Promise<{ name: string; uri: string }> {
  console.log('[FILES_API] Uploading file bytes:', fileBytes.length, 'bytes');

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': fileBytes.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(fileBytes),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`File upload failed: ${response.status} ${error}`);
  }

  const fileMetadata = await response.json();
  return {
    name: fileMetadata.file.name,
    uri: fileMetadata.file.uri,
  };
}

/**
 * Step 3: Analyze video using Gemini with file URI (pure REST API)
 */
async function analyzeVideoWithFileUri(fileUri: string, mimeType: string): Promise<string> {
  console.log('[FILES_API] Analyzing with Gemini, file URI:', fileUri.substring(0, 60), '...');

  const prompt =
    'Analyze this pickleball video and return ONLY a JSON object with: {kitchenTransition:{thirdShotSuccessRate:0-100,returnContactDepth:0-20},softGame:{deadDinksCount:0+,unforcedErrorsCount:0+},shotPlacement:{targetingAccuracy:0-100},hardGame:{speedUpEfficiency:0-100,forcedErrorsCaused:0+},netDefense:{resetSuccessPercent:0-100,popUpFrequency:0-100},playerInsights:["insight1","insight2"]}';

  const response = await fetch(`${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              file_data: {
                mime_type: mimeType,
                file_uri: fileUri,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} ${error}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  console.log('[FILES_API] Gemini response length:', text.length);
  return text;
}

/**
 * Step 3.5: Wait for file to finish processing
 * Google processes videos asynchronously - must poll until ACTIVE
 */
async function waitForFileProcessing(fileName: string, maxWaitMs: number = 60000): Promise<void> {
  console.log('[FILES_API] Waiting for file to finish processing...');

  const startTime = Date.now();
  const pollIntervalMs = 1000; // Check every 1 second

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${BASE_URL}/v1beta/files/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check file status: ${response.status}`);
    }

    const fileMetadata = await response.json();
    const state = fileMetadata.file.state;

    console.log(`[FILES_API] File state: ${state}`);

    if (state === 'ACTIVE') {
      console.log('[FILES_API] File processing complete - ACTIVE');
      return;
    }

    if (state === 'PROCESSING') {
      console.log('[FILES_API] File still processing... waiting');
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }

    // Unexpected state - don't proceed
    throw new Error(`Unexpected file state: ${state}. Expected PROCESSING or ACTIVE.`);
  }

  throw new Error(`File processing timeout after ${maxWaitMs}ms. File may still be processing.`);
}

/**
 * Step 4: Delete file from Gemini
 */
async function deleteFile(fileName: string): Promise<void> {
  console.log('[FILES_API] Deleting file:', fileName);

  const response = await fetch(`${BASE_URL}/v1beta/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
    },
  });

  if (!response.ok) {
    console.warn('[FILES_API] Delete warning:', response.status, '(file will auto-delete in 48h)');
  }
}

/**
 * Analyze video using Gemini Files API (video URL)
 */
async function analyzeVideoFile(videoUrl: string): Promise<string> {
  console.log('[ROUTE] Starting video analysis with Files API');

  // Download video
  console.log('[ROUTE] Downloading video from:', videoUrl.substring(0, 60), '...');
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const arrayBuffer = await videoResponse.arrayBuffer();
  const videoBytes = Buffer.from(arrayBuffer);
  const mimeType = 'video/mp4';
  const displayName = `pickleball_${Date.now()}.mp4`;

  console.log('[ROUTE] Video downloaded:', videoBytes.length, 'bytes');

  let fileName: string | null = null;

  try {
    // Step 1: Initiate upload
    const uploadUrl = await initiateUpload(displayName, mimeType, videoBytes.length);

    // Step 2: Upload file bytes
    const fileMetadata = await uploadFileBytes(uploadUrl, videoBytes, mimeType);
    fileName = fileMetadata.name;

    // Step 3.5: Wait for file to be processed
    await waitForFileProcessing(fileName);

    // Step 3: Analyze with Gemini
    const analysisText = await analyzeVideoWithFileUri(fileMetadata.uri, mimeType);

    console.log('[ROUTE] Analysis complete');
    return analysisText;
  } finally {
    // Step 4: Cleanup
    if (fileName) {
      try {
        await deleteFile(fileName);
      } catch (e) {
        console.error('[ROUTE] Cleanup error:', e);
      }
    }
  }
}

/**
 * Analyze image frame (fallback)
 */
async function analyzeImageFrame(frameBase64: string): Promise<string> {
  console.log('[ROUTE] Analyzing image frame (fallback)');

  const prompt =
    'Analyze this pickleball image and return ONLY a JSON object with: {kitchenTransition:{thirdShotSuccessRate:0-100,returnContactDepth:0-20},softGame:{deadDinksCount:0+,unforcedErrorsCount:0+},shotPlacement:{targetingAccuracy:0-100},hardGame:{speedUpEfficiency:0-100,forcedErrorsCaused:0+},netDefense:{resetSuccessPercent:0-100,popUpFrequency:0-100},playerInsights:["insight1","insight2"]}';

  const response = await fetch(`${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: frameBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Analysis failed: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(request: Request) {
  try {
    const { frameBase64, videoUrl, userId, videoId } = await request.json();

    if (!frameBase64 && !videoUrl) {
      return Response.json({ success: false, error: 'No input provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return Response.json({ success: false, error: 'API key missing' }, { status: 500 });
    }

    // Choose analysis method
    let analysisText: string;
    if (videoUrl) {
      analysisText = await analyzeVideoFile(videoUrl);
    } else {
      analysisText = await analyzeImageFrame(frameBase64);
    }

    console.log('[ROUTE] Raw analysis text:', analysisText.substring(0, 200));

    // Parse JSON response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

    const result: AnalysisResult = {
      success: true,
      kitchenTransition: analysis.kitchenTransition || { thirdShotSuccessRate: 0, returnContactDepth: 0 },
      softGame: analysis.softGame || { deadDinksCount: 0, unforcedErrorsCount: 0 },
      shotPlacement: analysis.shotPlacement || { targetingAccuracy: 0 },
      hardGame: analysis.hardGame || { speedUpEfficiency: 0, forcedErrorsCaused: 0 },
      netDefense: analysis.netDefense || { resetSuccessPercent: 0, popUpFrequency: 0 },
      playerInsights: analysis.playerInsights || [],
    };

    console.log('[ROUTE] Parsed metrics:', result);

    // Save to database
    if (userId && videoId) {
      try {
        await saveVideoAnalysis(userId, videoId, result);
        console.log('[ROUTE] Analysis saved to database');
      } catch (e) {
        console.error('[ROUTE] DB save failed:', e);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[ROUTE] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

