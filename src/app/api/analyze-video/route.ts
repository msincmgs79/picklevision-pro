import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return Response.json({ error: 'Video URL required' }, { status: 400 });
    }

    // Analyze video with Claude Vision for shot analysis and player colors
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
                type: 'url',
                url: videoUrl,
              },
            },
            {
              type: 'text',
              text: `Analyze this pickleball match video frame and provide:

1. Shot type counts (dinks, drives, drops, lobs, volleys, smashes, serves)
2. Player clothing colors - describe the shirt color and shorts/pants color for up to 4 players you can see
3. Player technique assessment (footwork 1-5, positioning 1-5, consistency 1-5)
4. Game style (aggressive, defensive, or balanced)

For player colors, format as: "Player 1: Red shirt, Black shorts" etc.

Return a JSON response with this structure:
{
  "shotCounts": { "dinks": number, "drives": number, "drops": number, "lobs": number, "volleys": number, "smashes": number, "serves": number },
  "playerColors": [
    { "id": 1, "shirtColor": "string", "shortsColor": "string" },
    ...
  ],
  "playerTechnique": { "footwork": number, "positioning": number, "consistency": number },
  "gameStyle": "aggressive" | "defensive" | "balanced"
}`,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    let analysisData;
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error('Failed to parse analysis response');
    }

    // Normalize color names to match our available colors
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
    };

    const normalizeColor = (color: string): string => {
      const normalized = color.toLowerCase().trim();
      for (const [key, value] of Object.entries(colorMap)) {
        if (normalized.includes(key)) {
          return value;
        }
      }
      return color.charAt(0).toUpperCase() + color.slice(1);
    };

    // Normalize player colors
    const normalizedPlayers = (analysisData.playerColors || []).slice(0, 4).map(
      (player: { id: number; shirtColor: string; shortsColor: string }, index: number) => ({
        id: index + 1,
        shirtColor: normalizeColor(player.shirtColor || 'Black'),
        shortsColor: normalizeColor(player.shortsColor || 'White'),
      })
    );

    // Pad with common outfits if less than 4 detected
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
          dinks: analysisData.shotCounts?.dinks || 0,
          drives: analysisData.shotCounts?.drives || 0,
          drops: analysisData.shotCounts?.drops || 0,
          lobs: analysisData.shotCounts?.lobs || 0,
          volleys: analysisData.shotCounts?.volleys || 0,
          smashes: analysisData.shotCounts?.smashes || 0,
          serves: analysisData.shotCounts?.serves || 0,
        },
        playerTechnique: {
          footwork: analysisData.playerTechnique?.footwork || 3,
          positioning: analysisData.playerTechnique?.positioning || 3,
          consistency: analysisData.playerTechnique?.consistency || 50,
        },
        gameStyle: analysisData.gameStyle || 'balanced',
        gameInsights: [`Game style detected: ${analysisData.gameStyle || 'balanced'}`],
        totalShots:
          (analysisData.shotCounts?.dinks || 0) +
          (analysisData.shotCounts?.drives || 0) +
          (analysisData.shotCounts?.drops || 0) +
          (analysisData.shotCounts?.lobs || 0) +
          (analysisData.shotCounts?.volleys || 0) +
          (analysisData.shotCounts?.smashes || 0) +
          (analysisData.shotCounts?.serves || 0),
        playerColors: normalizedPlayers,
      },
    });
  } catch (error) {
    console.error('Video analysis error:', error);
    return Response.json(
      { error: 'Failed to analyze video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
