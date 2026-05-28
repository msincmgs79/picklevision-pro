import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { frameBase64 } = await request.json();
    if (!frameBase64) {
      return Response.json({ error: 'Frame data required' }, { status: 400 });
    }
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: frameBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this pickleball match image and identify player clothing colors. Return ONLY valid JSON:
{
  "playerColors": [
    { "id": 1, "shirtColor": "Red", "shortsColor": "Black" },
    { "id": 2, "shirtColor": "Black", "shortsColor": "White" }
  ],
  "playerTechnique": {
    "footwork": 3,
    "positioning": 3,
    "consistency": 60
  }
}
Color names must be one of: Red, Blue, Black, White, Navy, Gray, Orange, Purple, Yellow, Green, or Khaki.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    let analysisData;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error('Failed to parse analysis response');
    }
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
      (player: { id: number; shirtColor: string; shortsColor: string }, index: number) => ({
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
          footwork: analysisData.playerTechnique?.footwork || 3,
          positioning: analysisData.playerTechnique?.positioning || 3,
          consistency: analysisData.playerTechnique?.consistency || 60,
        },
        gameStyle: 'balanced',
        gameInsights: ['Frame analyzed successfully'],
        totalShots: 0,
        playerColors: normalizedPlayers,
      },
    });
  } catch (error) {
    console.error('Video analysis error:', error);
    return Response.json(
      { error: 'Failed to analyze video frame', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
