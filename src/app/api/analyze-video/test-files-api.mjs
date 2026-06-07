/**
 * Test script for Gemini Files API implementation
 *
 * This verifies the entire flow:
 * 1. Resumable upload initiation
 * 2. File bytes upload
 * 3. Gemini analysis with file URI
 * 4. File cleanup
 *
 * Run with: node test-files-api.mjs
 */

import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

console.log('=== GEMINI FILES API TEST ===\n');
console.log('API Key configured:', GEMINI_API_KEY.substring(0, 10) + '...');
console.log('Base URL:', BASE_URL);
console.log('');

/**
 * Test 1: Verify API connectivity
 */
async function testConnectivity() {
  console.log('TEST 1: API Connectivity');
  console.log('------------------------');
  try {
    const response = await fetch(`${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say OK' }] }],
      }),
    });

    if (response.ok) {
      console.log('✓ API is reachable and responding');
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`  Response: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    } else {
      console.error(`✗ API error: ${response.status}`);
      const error = await response.text();
      console.error(`  ${error.substring(0, 200)}`);
    }
  } catch (e) {
    console.error('✗ Network error:', e.message);
  }
}

/**
 * Test 2: Test resumable upload with actual video file
 * If video file doesn't exist, creates a minimal test video
 */
async function testResumableUpload() {
  console.log('\n\nTEST 2: Resumable Upload Protocol');
  console.log('-----------------------------------');

  // Check for test video
  let videoPath = './test-video.mp4';
  let videoBytes;

  if (!fs.existsSync(videoPath)) {
    console.log('No test video found. Creating minimal test video...');
    // Create a minimal valid MP4 file (just file type, won't play but valid for upload)
    const minimalMP4 = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
      0x6d, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08,
    ]);
    videoBytes = minimalMP4;
    console.log(`✓ Created minimal test video (${videoBytes.length} bytes)`);
  } else {
    videoBytes = fs.readFileSync(videoPath);
    console.log(`✓ Loaded test video: ${videoPath} (${videoBytes.length} bytes)`);
  }

  const mimeType = 'video/mp4';
  const displayName = `test_${Date.now()}.mp4`;

  let uploadUrl = null;
  let fileName = null;

  try {
    // Step 1: Initiate upload
    console.log('\nStep 1: Initiating resumable upload...');
    const initiateResponse = await fetch(`${BASE_URL}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': videoBytes.length.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: displayName },
      }),
    });

    if (!initiateResponse.ok) {
      throw new Error(`Initiation failed: ${initiateResponse.status}`);
    }

    uploadUrl = initiateResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('No upload URL in response headers');
    }

    console.log('✓ Upload session initiated');
    console.log(`  Upload URL: ${uploadUrl.substring(0, 60)}...`);

    // Step 2: Upload file bytes
    console.log('\nStep 2: Uploading file bytes...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': videoBytes.length.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: videoBytes,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const fileMetadata = await uploadResponse.json();
    fileName = fileMetadata.file.name;
    const fileUri = fileMetadata.file.uri;

    console.log('✓ File uploaded successfully');
    console.log(`  File name: ${fileName}`);
    console.log(`  File URI: ${fileUri}`);
    console.log(`  MIME type: ${fileMetadata.file.mimeType}`);
    console.log(`  Size: ${fileMetadata.file.sizeBytes} bytes`);

    // Step 3.5: Wait for file to be processed
    console.log('\nStep 3.5: Waiting for file to be processed...');
    let fileState = null;
    let waitAttempts = 0;
    const maxWaitAttempts = 60;

    while (waitAttempts < maxWaitAttempts) {
      const statusResponse = await fetch(
        `${BASE_URL}/v1beta/files/${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: {
            'x-goog-api-key': GEMINI_API_KEY,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check file status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      fileState = statusData.file.state;
      console.log(`  File state: ${fileState}`);

      if (fileState === 'ACTIVE') {
        console.log('✓ File processing complete');
        break;
      }

      if (fileState === 'PROCESSING') {
        console.log('  Still processing... waiting 1 second');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        waitAttempts++;
      } else {
        console.log(`  Unexpected state: ${fileState}`);
        break;
      }
    }

    if (fileState !== 'ACTIVE') {
      throw new Error(`File did not reach ACTIVE state. Final state: ${fileState}`);
    }

    // Step 3: Test generateContent with file URI
    console.log('\nStep 3: Testing generateContent with file URI...');
    const analysisResponse = await fetch(
      `${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`,
      {
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
                  text: 'Describe this video briefly (one sentence max)',
                },
              ],
            },
          ],
        }),
      }
    );

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error(`✗ Analysis failed: ${analysisResponse.status}`);
      console.error(`  ${error.substring(0, 300)}`);
    } else {
      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✓ Analysis completed');
      console.log(`  Response: "${analysisText.substring(0, 100)}${analysisText.length > 100 ? '...' : ''}"`);
    }
  } catch (e) {
    console.error('✗ Error during upload:', e.message);
  } finally {
    // Step 4: Cleanup
    if (fileName) {
      console.log('\nStep 4: Cleaning up...');
      try {
        const deleteResponse = await fetch(
          `${BASE_URL}/v1beta/files/${encodeURIComponent(fileName)}`,
          {
            method: 'DELETE',
            headers: {
              'x-goog-api-key': GEMINI_API_KEY,
            },
          }
        );

        if (deleteResponse.ok) {
          console.log('✓ File deleted successfully');
        } else {
          console.warn(`⚠ Delete returned ${deleteResponse.status} (file will auto-delete in 48h)`);
        }
      } catch (e) {
        console.error('⚠ Error during cleanup:', e.message);
      }
    }
  }
}

/**
 * Test 3: Verify JSON parsing works with Gemini response
 */
async function testJSONParsing() {
  console.log('\n\nTEST 3: JSON Parsing');
  console.log('---------------------');

  try {
    const response = await fetch(
      `${BASE_URL}/v1beta/models/gemini-3.5-flash:generateContent`,
      {
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
                  text: 'Return ONLY a valid JSON object (no markdown, no extra text): {"test": "value", "number": 42}',
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Raw response:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✓ Successfully parsed JSON:', parsed);
      } catch (e) {
        console.error('✗ JSON parse failed:', e.message);
      }
    } else {
      console.warn('⚠ No JSON found in response');
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  await testConnectivity();
  await testResumableUpload();
  await testJSONParsing();

  console.log('\n\n=== TEST COMPLETE ===\n');
}

runAllTests().catch(console.error);
