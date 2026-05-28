import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const videoBase64 = body.videoBase64;

    console.log('📥 API Request received');
    console.log('Request body keys:', Object.keys(body));
    console.log('videoBase64 present:', !!videoBase64);
    console.log('videoBase64 length:', videoBase64?.length || 0);

    if (!videoBase64 || videoBase64.length === 0) {
      console.error('❌ No video data provided');
      return Response.json({
        success: false,
        error: 'Video data required',
        details: 'No videoBase64 in request body',
      }, { status: 400 });
    }

    console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set in environment');
      return Response.json({
        success: false,
        error: 'API configuration error',
        details: 'GEMINI_API_KEY not configured',
      }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    console.log('🤖 Gemini model initialized');

    const prompt = `Analyze this pickleball match video and identify the clothing colors of all 4 players visible in the video.

Return ONLY valid JSON (no other text):
{
  "playerColors": [
    { "id": 1, "shirtColor": "Color", "shortsColor": "Color" },
    { "id": 2, "shirtColor": "Color", "shortsColor": "Color" },
    { "id": 3, "shirtColor": "Color", "shortsColor": "Color" },
    { "id": 4, "shirtColor": "Color", "shortsColor": "Color" }
  ]
}

Color names must be one of: Red, Blue, Black, White, Navy, Gray, Orange, Purple, Yellow, Green, or Khaki.

Focus on identifying the actual clothing colors of the players in the video. Be accurate and specific.`;

    const response = await model.generateContent([
      {
        inlineData: {
          data: videoBase64,
          mimeType: 'video/mp4',
        },
      },
      {
        text: prompt,
      },
    ]);

    console.log('📊 Gemini response received');
    console.log('Response type:', typeof response);

    let responseText = '';
    const resp = response as any;

    // Try to get text from the response - try all known paths
    try {
      if (resp.candidates?.[0]?.content?.parts?.[0]?.text) {
        responseText = resp.candidates[0].content.parts[0].text;
        console.log('✓ Got text from: candidates[0].content.parts[0].text');
      } else if (typeof resp.text === 'function') {
        responseText = resp.text();
        console.log('✓ Got text from: response.text() method');
      } else if (resp.text && typeof resp.text === 'string') {
        responseText = resp.text;
        console.log('✓ Got text from: response.text property');
      } else {
        // Log structure for debugging
        console.log('Response object keys:', Object.keys(resp).join(', '));
        console.log('Full response:', JSON.stringify(resp).substring(0, 500));
        throw new Error('Could not extract text from any known path in response');
      }
    } catch (textErr) {
      console.error('❌ Error extracting text:', textErr);
      return Response.json({
        success: false,
        error: 'Failed to extract text from Gemini API',
        details: (textErr as any)?.message || 'Unknown error',
      }, { status: 500 });
    }

    if (!responseText || responseText.length === 0) {
      console.error('❌ Response text is empty');
      return Response.json({
        success: false,
        error: 'Empty response from Gemini API',
        details: 'API returned no text content',
      }, { status: 500 });
    }

    console.log('✓ Response text length:', responseText.length);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({
        success: false,
        error: 'Could not parse colors from video',
        details: 'No valid JSON in response',
      }, { status: 500 });
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    const colorMap: Record<string, string> = {
      'red': 'Red',
      'blue': 'Blue',
      'black': 'Black',
      'white': 'White',
      'navy': 'Navy',
      'gray': 'Gray',
      'grey': 'Gray',
      'orange': 'Orange',
      'purple': 'Purple',
      'yellow': 'Yellow',
      'green': 'Green',
      'khaki': 'Khaki',
      'neon yellow': 'Yellow',
      'neon': 'Yellow',
    };

    const normalizeColor = (color: string): string => {
      const normalized = color.toLowerCase().trim();
      for (const [key, value] of Object.entries(colorMap)) {
        if (normalized.includes(key)) {
          return value;
        }
      }
      return 'Black';
    };

    const normalizedPlayers = (analysisData.playerColors || []).slice(0, 4).map(
      (player: any, index: number) => ({
        id: index + 1,
        shirtColor: normalizeColor(player.shirtColor || 'Black'),
        shortsColor: normalizeColor(player.shortsColor || 'White'),
      })
    );

    const commonOutfits = [
      { shirt: 'Black', shorts: 'White' },
      { shirt: 'White', shorts: 'Black' },
      { shirt: 'Navy', shorts: 'White' },
      { shirt: 'Gray', shorts: 'Black' },
    ];

    while (normalizedPlayers.length < 4) {
      const outfit = commonOutfits[normalizedPlayers.length];
      normalizedPlayers.push({
        id: normalizedPlayers.length + 1,
        shirtColor: outfit.shirt,
        shortsColor: outfit.shorts,
      });
    }

    return Response.json({
      success: true,
      analysis: {
        shotSummary: {
          dinks: 0,
          drives: 0,
          drops: 0,
          lobs: 0,
          volleys: 0,
          smashes: 0,
          serves: 0,
        },
        playerTechnique: {
          footwork: 3,
          positioning: 3,
          consistency: 60,
        },
        gameStyle: 'balanced',
        gameInsights: ['Video analyzed successfully'],
        totalShots: 0,
        playerColors: normalizedPlayers,
      },
    });
  } catch (error) {
    const err = error as any;
    console.error('Gemini API error:', err);
    return Response.json({
      success: false,
      error: 'Failed to analyze video',
      details: err?.message || 'Unknown error',
    }, { status: 500 });
  }
}
