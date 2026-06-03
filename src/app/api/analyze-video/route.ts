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
    console.error('🔵 [SERVER] /api/analyze-video POST request received');
    const { frameBase64 } = await request.json();
    console.error('🔵 [SERVER] Frame base64 received, length:', frameBase64?.length || 'undefined');

    if (!frameBase64) {
      console.error('❌ [SERVER] No frame provided');
      return Response.json({ success: false, error: 'No frame provided' }, { status: 400 });
    }

    // Initialize Gemini client at runtime to read environment variable from current server instance
    const apiKey = process.env.GEMINI_API_KEY;
    console.error('🔵 [SERVER] API Key check:', apiKey ? '✅ Key exists' : '❌ Key missing');
    if (!apiKey) {
      console.error('❌ [SERVER] GEMINI_API_KEY environment variable is not set');
      return Response.json({
        success: false,
        error: 'Gemini API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      }, { status: 500 });
    }

    console.error('🔵 [SERVER] Initializing GoogleGenerativeAI with API key');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-1-flash-lite' });
    console.error('🔵 [SERVER] Model initialized successfully');

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

    console.error('🔵 [SERVER] Calling Gemini API with frame and prompt...');
    const response = await model.generateContent([
      { inlineData: { data: frameBase64, mimeType: 'image/jpeg' } },
      { text: analysisPrompt }
    ]);
    console.error('🔵 [SERVER] Gemini API response received');

    const resp = response as any;
    console.error('🔵 [SERVER] Response object structure:', {
      hasCandidates: !!resp.candidates,
      candidatesLength: resp.candidates?.length,
      hasText: !!resp.text,
    });

    let text = resp.candidates?.[0]?.content?.parts?.[0]?.text ||
               (typeof resp.text === 'function' ? resp.text() : resp.text);

    console.error('🔵 [SERVER] Extracted text from response, length:', text?.length || 'null');
    if (!text) {
      console.error('❌ [SERVER] No response text from Gemini');
      throw new Error('No response from Gemini');
    }

    console.error('🔵 [SERVER] Raw Gemini response (first 500 chars):', text.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : '{}';
    console.error('🔵 [SERVER] JSON extracted, length:', jsonText.length);
    console.error('🔵 [SERVER] Extracted JSON (first 300 chars):', jsonText.substring(0, 300));

    const analysis = JSON.parse(jsonText);
    console.error('🔵 [SERVER] JSON parsed successfully');
    console.error('🔵 [SERVER] Analysis object keys:', Object.keys(analysis));
    console.error('🔵 [SERVER] Detected shot:', JSON.stringify(analysis.detectedShot, null, 2));

    // Transform to VideoAnalysisResult format
    console.error('🔵 [SERVER] Transforming Gemini response to VideoAnalysisResult...');
    const shotSummary = {
      dinks: analysis.detectedShot?.type === 'dink' ? 1 : 0,
      drives: analysis.detectedShot?.type === 'drive' ? 1 : 0,
      drops: analysis.detectedShot?.type === 'drop' ? 1 : 0,
      lobs: analysis.detectedShot?.type === 'lob' ? 1 : 0,
      volleys: analysis.detectedShot?.type === 'volley' ? 1 : 0,
      smashes: analysis.detectedShot?.type === 'smash' ? 1 : 0,
      serves: analysis.detectedShot?.type === 'serve' ? 1 : 0,
    };
    console.error('🔵 [SERVER] Shot summary:', JSON.stringify(shotSummary, null, 2));

    const playerTechnique = {
      footwork: analysis.shotQuality ? analysis.shotQuality * 20 : 60,
      positioning: analysis.courtStateBefore?.playerPositions?.length > 0 ? 70 : 50,
      consistency: analysis.likelyOutcome === 'winning_shot' ? 80 : analysis.likelyOutcome === 'continued_rally' ? 65 : 50,
    };
    console.error('🔵 [SERVER] Player technique:', JSON.stringify(playerTechnique, null, 2));

    const finalResponse = {
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
    };
    console.error('✅ [SERVER] Returning final response:', JSON.stringify(finalResponse, null, 2));
    return Response.json(finalResponse);
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: String(error)
    }, { status: 500 });
  }
}
