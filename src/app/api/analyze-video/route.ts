import { GoogleGenerativeAI } from '@google/generative-ai';


interface CourtState {
  ballPosition: { zone: string; x: number; y: number } | null;
  playerPositions: { player: number; zone: string; x: number; y: number }[];
  kitchenProximity: 'in_kitchen' | 'near_kitchen' | 'baseline' | 'mid_court';
  rallyStage: 'service' | 'return' | 'third_shot' | 'dink_rally' | 'attack' | 'unknown';
}

interface ShotWithContext {
  shotType: 'dink' | 'drive' | 'drop' | 'lob' | 'volley' | 'smash' | 'serve' | 'unknown';
  confidence: number;
  courtStateBefore: CourtState;
  courtStateAfter: CourtState;
  likelyOutcome: 'winning_shot' | 'continued_rally' | 'difficult_position' | 'unknown';
  playerExecuting: number;
}

interface RallySegment {
  rallyNumber: number;
  startingServer: number;
  shots: ShotWithContext[];
  outcome: 'point_won' | 'rally_continued' | 'unknown';
}

export async function POST(request: Request) {
  try {
    const { frameBase64 } = await request.json();

    if (!frameBase64) {
      return Response.json({ success: false, error: 'No frame provided' }, { status: 400 });
    }

        // Initialize Gemini client at runtime to read environment variable from current server instance
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
                console.error('❌ GEMINI_API_KEY environment variable is not set');
                return Response.json({
                          success: false,
                          error: 'Gemini API key not configured',
                          details: 'GEMINI_API_KEY environment variable is missing'
                }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const analysisPrompt = `You are a professional pickleball coach analyzing a match frame. Extract detailed court state and shot analysis.

CRITICAL: Return ONLY valid JSON (no markdown, no explanations). If you cannot extract information, return empty arrays/nulls.

Analyze this pickleball frame and return JSON with this EXACT structure:
{
  "playerColors": [
    {"id":1,"shirtColor":"Color","shortsColor":"Color"},
    {"id":2,"shirtColor":"Color","shortsColor":"Color"},
    {"id":3,"shirtColor":"Color","shortsColor":"Color"},
    {"id":4,"shirtColor":"Color","shortsColor":"Color"}
  ],
  "detectedShot": {
    "type": "dink|drive|drop|lob|volley|smash|serve|unknown",
    "confidence": 0.0-1.0,
    "playerExecuting": 1-4
  },
  "courtStateBefore": {
    "ballPosition": {"zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100},
    "playerPositions": [
      {"player": 1, "zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100},
      {"player": 2, "zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100}
    ],
    "kitchenProximity": "in_kitchen|near_kitchen|baseline|mid_court",
    "rallyStage": "service|return|third_shot|dink_rally|attack|unknown"
  },
  "courtStateAfter": {
    "ballPosition": {"zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100},
    "playerPositions": [
      {"player": 1, "zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100},
      {"player": 2, "zone": "baseline|mid_court|kitchen|net", "x": 0-100, "y": 0-100}
    ],
    "kitchenProximity": "in_kitchen|near_kitchen|baseline|mid_court",
    "rallyStage": "dink_rally|attack|unknown"
  },
  "likelyOutcome": "winning_shot|continued_rally|difficult_position|unknown",
  "shotQuality": 1-5,
  "techniqueFeedback": "brief description of footwork/positioning/technique",
  "proStyleMatch": "name of pro player with similar style and explanation",
  "gameInsights": ["insight1", "insight2"]
}

COURT ZONES (reference):
- baseline: 80-100 (back of court)
- mid_court: 40-80 (between baseline and kitchen)
- kitchen: 0-20 (non-volley zone)
- net: x-coordinate represents distance from net (closer to 0 = closer to net)

COLOR OPTIONS: Red, Blue, Black, White, Navy, Gray, Orange, Purple, Yellow, Green, Khaki`;

    const response = await model.generateContent([
      { inlineData: { data: frameBase64, mimeType: 'image/jpeg' } },
      { text: analysisPrompt }
    ]);

    const resp = response as any;
    let text = resp.candidates?.[0]?.content?.parts?.[0]?.text ||
               (typeof resp.text === 'function' ? resp.text() : resp.text);

    if (!text) throw new Error('No response from Gemini');

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : '{}';
    const analysis = JSON.parse(jsonText);

    // Transform to VideoAnalysisResult format
    const shotSummary = {
      dinks: analysis.detectedShot?.type === 'dink' ? 1 : 0,
      drives: analysis.detectedShot?.type === 'drive' ? 1 : 0,
      drops: analysis.detectedShot?.type === 'drop' ? 1 : 0,
      lobs: analysis.detectedShot?.type === 'lob' ? 1 : 0,
      volleys: analysis.detectedShot?.type === 'volley' ? 1 : 0,
      smashes: analysis.detectedShot?.type === 'smash' ? 1 : 0,
      serves: analysis.detectedShot?.type === 'serve' ? 1 : 0,
    };

    const playerTechnique = {
      footwork: analysis.shotQuality ? analysis.shotQuality * 20 : 60,
      positioning: analysis.courtStateBefore?.playerPositions?.length > 0 ? 70 : 50,
      consistency: analysis.likelyOutcome === 'winning_shot' ? 80 : analysis.likelyOutcome === 'continued_rally' ? 65 : 50,
    };

    return Response.json({
      success: true,
      analysis: {
        shotSummary,
        playerTechnique,
        gameStyle: analysis.courtStateBefore?.rallyStage === 'dink_rally' ? 'defensive' : 'aggressive',
        gameInsights: analysis.gameInsights || [],
        totalShots: 1,
        playerColors: analysis.playerColors || [],
        // Include full court state data for pro-benchmark model
        courtData: {
          detectedShot: analysis.detectedShot,
          courtStateBefore: analysis.courtStateBefore,
          courtStateAfter: analysis.courtStateAfter,
          likelyOutcome: analysis.likelyOutcome,
          proStyleMatch: analysis.proStyleMatch,
          techniqueFeedback: analysis.techniqueFeedback,
        },
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: String(error)
    }, { status: 500 });
  }
}
