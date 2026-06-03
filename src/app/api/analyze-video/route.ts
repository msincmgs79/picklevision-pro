import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveVideoAnalysis } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { frameBase64, userId, videoId } = await request.json();

    if (!frameBase64) {
      return Response.json({ success: false, error: 'No frame provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({
        success: false,
        error: 'Gemini API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-1-flash-lite' });

    const analysisPrompt = `You are a professional pickleball coach analyzing a match frame.
Return ONLY valid JSON with this structure:
{
  "detectedShot": {"type": "dink|drive|drop|lob|volley|smash|serve|unknown"},
  "shotQuality": 1-5,
  "gameInsights": ["insight1"]
}`;

    const response = await model.generateContent([
      { inlineData: { data: frameBase64, mimeType: 'image/jpeg' } },
      { text: analysisPrompt }
    ]);

    const resp = response as any;
    let text = resp.candidates?.[0]?.content?.parts?.[0]?.text || resp.text?.();

    if (!text) throw new Error('No response from Gemini');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : '{}';
    const analysis = JSON.parse(jsonText);

    const shotBreakdown = {
      totalShots: 1,
      shotCounts: {
        dinks: analysis.detectedShot?.type === 'dink' ? 1 : 0,
        drives: analysis.detectedShot?.type === 'drive' ? 1 : 0,
        drops: analysis.detectedShot?.type === 'drop' ? 1 : 0,
        lobs: analysis.detectedShot?.type === 'lob' ? 1 : 0,
        volleys: analysis.detectedShot?.type === 'volley' ? 1 : 0,
        smashes: analysis.detectedShot?.type === 'smash' ? 1 : 0,
        serves: analysis.detectedShot?.type === 'serve' ? 1 : 0,
      },
      effectivenessScore: analysis.shotQuality ? analysis.shotQuality * 20 : 60,
    };

    const rallySummary = {
      totalRallies: 1,
      avgRallyLength: 3,
    };

    const techniqueAnalysis = {
      footwork: { rating: analysis.shotQuality || 3 },
      positioning: { rating: analysis.shotQuality ? analysis.shotQuality - 0.5 : 2.5 },
      racketTechnique: { rating: analysis.shotQuality || 3 },
      balance: { rating: analysis.shotQuality ? analysis.shotQuality - 1 : 2 },
    };

    const coachingTips = analysis.gameInsights && Array.isArray(analysis.gameInsights) ? analysis.gameInsights : [];

    const finalResponse = {
      success: true,
      shotBreakdown,
      rallySummary,
      techniqueAnalysis,
      coachingTips,
      analysis: {
        shotSummary: shotBreakdown.shotCounts,
        playerTechnique: {
          footwork: analysis.shotQuality ? analysis.shotQuality * 20 : 60,
          positioning: analysis.shotQuality ? analysis.shotQuality * 12 : 50,
          consistency: analysis.shotQuality ? analysis.shotQuality * 15 : 50,
        },
        gameStyle: 'aggressive',
        gameInsights: analysis.gameInsights || [],
        totalShots: 1,
        playerColors: [],
        courtData: {
          detectedShot: analysis.detectedShot,
        },
      },
    };

    if (userId && videoId) {
      try {
        await saveVideoAnalysis(userId, videoId, finalResponse);
        console.log('✅ Analysis saved to Firestore:', videoId);
      } catch (dbError) {
        console.error('⚠️ Failed to save analysis to database:', dbError);
      }
    }

    return Response.json(finalResponse);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: String(error)
    }, { status: 500 });
  }
}
