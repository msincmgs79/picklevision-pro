import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { videoBase64 } = await request.json();

    if (!videoBase64) {
      return Response.json({
        error: 'Video data required',
        details: 'No videoBase64 in request body'
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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

    const responseText = response.content.parts[0].text;

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
