import { saveVideoAnalysis } from '@/lib/db';
import { spawn } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const BASE_URL = 'https://generativelanguage.googleapis.com';

interface BallTrajectory {
  player: 1 | 2;
  playerName: string;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
  inOrOut: 'in' | 'out';
}

interface AnalysisResult {
  success: boolean;
  kitchenTransition: { thirdShotSuccessRate: number; returnContactDepth: number };
  softGame: { deadDinksCount: number; unforcedErrorsCount: number };
  shotPlacement: { targetingAccuracy: number };
  hardGame: { speedUpEfficiency: number; forcedErrorsCaused: number };
  netDefense: { resetSuccessPercent: number; popUpFrequency: number };
  playerInsights: string[];
  ballTrajectories?: BallTrajectory[];
}

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
    body: JSON.stringify({ file: { display_name: filename } }),
  });

  if (!response.ok) {
    throw new Error(`Upload initiation failed: ${response.status}`);
  }

  const uploadUrl = response.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }

  return uploadUrl;
}

async function uploadFileBytes(uploadUrl: string, fileBytes: Buffer, mimeType: string): Promise<{ name: string; uri: string }> {
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
    throw new Error(`File upload failed: ${response.status}`);
  }

  const fileMetadata = await response.json();
  return {
    name: fileMetadata.file.name,
    uri: fileMetadata.file.uri,
  };
}

async function analyzeVideoWithFileUri(fileUri: string, mimeType: string): Promise<string> {
  console.log('[HYBRID] Analyzing with Gemini');

  const prompt = 'Analyze this pickleball video. Extract all shots and return ONLY valid JSON with: ' +
    'kitchenTransition, softGame, shotPlacement, hardGame, netDefense, playerInsights, ballTrajectories. ' +
    'Each trajectory must have: player (1 or 2), playerName (Player 1 or Player 2), ' +
    'startPosition, endPosition, shotType, zoneStart, zoneEnd, inOrOut. ' +
    'For full 7-15 minute games, expect 300-900 shots.';

  const response = await fetch(`${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
          { text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini analysis failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[HYBRID] Gemini response received');
  return text;
}

async function waitForFileProcessing(fileName: string, maxWaitMs: number = 60000): Promise<void> {
  console.log('[FILES_API] Waiting for file processing...');

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${BASE_URL}/v1beta/${fileName}`, {
      method: 'GET',
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Failed to check file status: ${response.status}`);
    }

    const fileMetadata = await response.json();
    const state = fileMetadata.file?.state || fileMetadata.state;

    if (state === 'ACTIVE') {
      console.log('[FILES_API] File processing complete');
      return;
    }

    if (state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    throw new Error(`Unexpected file state: ${state}`);
  }

  throw new Error('File processing timeout');
}

async function deleteFile(fileName: string): Promise<void> {
  console.log('[FILES_API] Deleting file:', fileName);

  const response = await fetch(`${BASE_URL}/v1beta/${fileName}`, {
    method: 'DELETE',
    headers: { 'x-goog-api-key': GEMINI_API_KEY },
  });

  if (!response.ok) {
    console.warn('[FILES_API] Delete failed (file will auto-delete in 48h)');
  }
}

async function analyzeVideoFile(videoUrl: string): Promise<string> {
  console.log('[HYBRID] Starting video analysis');

  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const arrayBuffer = await videoResponse.arrayBuffer();
  const videoBytes = Buffer.from(arrayBuffer);
  const mimeType = 'video/mp4';
  const displayName = `pickleball_${Date.now()}.mp4`;

  console.log('[HYBRID] Video downloaded:', videoBytes.length, 'bytes');

  let fileName: string | null = null;

  try {
    const uploadUrl = await initiateUpload(displayName, mimeType, videoBytes.length);
    const fileMetadata = await uploadFileBytes(uploadUrl, videoBytes, mimeType);
    fileName = fileMetadata.name;

    await waitForFileProcessing(fileName);

    const analysisText = await analyzeVideoWithFileUri(fileMetadata.uri, mimeType);

    console.log('[HYBRID] Analysis complete');
    return analysisText;
  } finally {
    if (fileName) {
      try {
        await deleteFile(fileName);
      } catch (e) {
        console.error('[HYBRID] Cleanup error:', e);
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const { videoUrl, userId, videoId } = await request.json();

    if (!videoUrl) {
      return Response.json({ success: false, error: 'No video URL' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return Response.json({ success: false, error: 'API key missing' }, { status: 500 });
    }

    const analysisText = await analyzeVideoFile(videoUrl);

    console.log('[ROUTE] Raw analysis text:', analysisText.substring(0, 200));

    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

    let trajectories = Array.isArray(analysis.ballTrajectories) ? analysis.ballTrajectories : [];
    trajectories = trajectories.map((traj: any) => ({
      ...traj,
      playerName: traj.player === 1 ? 'Player 1' : 'Player 2',
      inOrOut: traj.inOrOut === 'out' ? 'out' : 'in',
    }));

    const result: AnalysisResult = {
      success: true,
      kitchenTransition: analysis.kitchenTransition || { thirdShotSuccessRate: 0, returnContactDepth: 0 },
      softGame: analysis.softGame || { deadDinksCount: 0, unforcedErrorsCount: 0 },
      shotPlacement: analysis.shotPlacement || { targetingAccuracy: 0 },
      hardGame: analysis.hardGame || { speedUpEfficiency: 0, forcedErrorsCaused: 0 },
      netDefense: analysis.netDefense || { resetSuccessPercent: 0, popUpFrequency: 0 },
      playerInsights: analysis.playerInsights || [],
      ballTrajectories: trajectories,
    };

    console.log('[ROUTE] Analysis complete:', {
      success: result.success,
      trajectories: trajectories.length,
    });

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
