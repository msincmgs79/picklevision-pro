/**
 * Gemini Files API implementation for video analysis
 * Uses resumable upload protocol as per Google documentation
 * Reference: https://ai.google.dev/gemini-api/docs/files
 *
 * Process:
 * 1. Initiate resumable upload session (REST)
 * 2. Upload file bytes (REST)
 * 3. Analyze with Gemini using file URI (REST)
 * 4. Delete file (REST)
 *
 * Pure REST API = zero SDK surprises
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const BASE_URL = 'https://generativelanguage.googleapis.com';

interface UploadSessionMetadata {
  file: {
    display_name: string;
  };
}

interface FileUploadResponse {
  file: {
    name: string;
    displayName: string;
    mimeType: string;
    sizeBytes: string;
    createTime: string;
    updateTime: string;
    expirationTime: string;
    sha256Hash: string;
    uri: string;
  };
}

/**
 * Step 1: Initiate resumable upload session
 * Returns the upload URL for Step 2
 */
async function initiateUpload(
  filename: string,
  mimeType: string,
  fileSizeBytes: number
): Promise<string> {
  console.log('[FILES_API] Step 1: Initiating resumable upload session');
  console.log(`  Filename: ${filename}`);
  console.log(`  MIME type: ${mimeType}`);
  console.log(`  Size: ${fileSizeBytes} bytes`);

  const metadata: UploadSessionMetadata = {
    file: {
      display_name: filename,
    },
  };

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
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload initiation failed: ${response.status} ${error}`);
  }

  const uploadUrl = response.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from initiation request');
  }

  console.log('[FILES_API] Step 1 complete - got upload URL');
  return uploadUrl;
}

/**
 * Step 2: Upload file bytes via resumable protocol
 * Returns the file metadata including the file URI
 */
async function uploadFileBytes(
  uploadUrl: string,
  fileBytes: Buffer,
  mimeType: string
): Promise<FileUploadResponse> {
  console.log('[FILES_API] Step 2: Uploading file bytes');
  console.log(`  Upload URL: ${uploadUrl.substring(0, 50)}...`);
  console.log(`  File size: ${fileBytes.length} bytes`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': fileBytes.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileBytes,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`File upload failed: ${response.status} ${error}`);
  }

  const fileMetadata = (await response.json()) as FileUploadResponse;
  console.log('[FILES_API] Step 2 complete - file uploaded');
  console.log(`  File name: ${fileMetadata.file.name}`);
  console.log(`  File URI: ${fileMetadata.file.uri}`);

  return fileMetadata;
}

/**
 * Step 3: Use uploaded file in generateContent request via REST API
 * This is the actual video analysis step
 * Uses REST API directly for maximum compatibility
 */
async function analyzeVideoWithFileUri(
  fileUri: string,
  mimeType: string
): Promise<string> {
  console.log('[FILES_API] Step 3: Analyzing video with Gemini (REST API)');
  console.log(`  File URI: ${fileUri}`);

  const prompt =
    'Analyze this pickleball video and return ONLY a JSON object with: {kitchenTransition:{thirdShotSuccessRate:0-100,returnContactDepth:0-20},softGame:{deadDinksCount:0+,unforcedErrorsCount:0+},shotPlacement:{targetingAccuracy:0-100},hardGame:{speedUpEfficiency:0-100,forcedErrorsCaused:0+},netDefense:{resetSuccessPercent:0-100,popUpFrequency:0-100},playerInsights:["insight1","insight2"]}';

  // REST API request body using file URI
  const requestBody = {
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
  };

  const response = await fetch(
    `${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} ${error}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  console.log('[FILES_API] Step 3 complete - Gemini response received');
  console.log(`  Response length: ${text.length} characters`);
  if (text.length === 0) {
    console.warn('[FILES_API] WARNING: Empty response from Gemini');
  }

  return text;
}

/**
 * Step 3.5: Wait for file to finish processing
 */
async function waitForFileProcessing(fileName: string, maxWaitMs: number = 60000): Promise<void> {
  console.log('[FILES_API] Waiting for file to finish processing...');

  const startTime = Date.now();
  const pollIntervalMs = 1000;

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

    throw new Error(`Unexpected file state: ${state}. Expected PROCESSING or ACTIVE.`);
  }

  throw new Error(`File processing timeout after ${maxWaitMs}ms. File may still be processing.`);
}

/**
 * Delete the uploaded file from Gemini
 */
async function deleteFile(fileName: string): Promise<void> {
  console.log(`[FILES_API] Cleaning up: Deleting ${fileName}`);

  const response = await fetch(
    `${BASE_URL}/v1beta/files/${encodeURIComponent(fileName)}`,
    {
      method: 'DELETE',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    }
  );

  if (!response.ok) {
    console.warn(`File deletion warning: ${response.status}`);
    // Don't throw - file will auto-delete in 48h anyway
  } else {
    console.log('[FILES_API] File deleted successfully');
  }
}

/**
 * Main function: Analyze pickleball video using Gemini Files API
 *
 * Process:
 * 1. Download video from URL
 * 2. Initiate resumable upload
 * 3. Upload file bytes
 * 4. Analyze with Gemini using file URI
 * 5. Clean up file
 */
export async function analyzeVideoWithFilesAPI(videoUrl: string): Promise<string> {
  console.log('[FILES_API] Starting video analysis');
  console.log(`  Video URL: ${videoUrl.substring(0, 50)}...`);

  let fileName: string | null = null;

  try {
    // Download video
    console.log('[FILES_API] Downloading video...');
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBytes = Buffer.from(videoBuffer);
    const mimeType = 'video/mp4';
    const displayName = `pickleball_${Date.now()}.mp4`;

    console.log(`[FILES_API] Video downloaded: ${videoBytes.length} bytes`);

    // Step 1: Initiate upload
    const uploadUrl = await initiateUpload(displayName, mimeType, videoBytes.length);

    // Step 2: Upload file bytes
    const fileMetadata = await uploadFileBytes(uploadUrl, videoBytes, mimeType);
    fileName = fileMetadata.file.name;

    // Step 3.5: Wait for file to be processed
    await waitForFileProcessing(fileName);

    // Step 3: Analyze with Gemini
    const analysisText = await analyzeVideoWithFileUri(
      fileMetadata.file.uri,
      mimeType
    );

    console.log('[FILES_API] Analysis complete');
    return analysisText;
  } finally {
    // Cleanup
    if (fileName) {
      try {
        await deleteFile(fileName);
      } catch (deleteError) {
        console.error('[FILES_API] Error during cleanup:', deleteError);
        // Continue anyway - file will auto-delete
      }
    }
  }
}
