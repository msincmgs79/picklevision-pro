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

    const analysisPrompt = `You are a professional pickleball coach analyzing a picklebal video match.
Analyze the entire video and return ONLY valid JSON with this structure:
{
  "shotAccuracy": 85,
  "totalShots": 86,
  "serve": {
    "averageSpeed": 61,
    "topSpeed": 69,
    "percentile": 95
  },
  "drive": {
    "averageSpeed": 44,
    "topSpeed": 77,
    "percentile": 66
  },
  "shotQuality": 60,
  "skillRating": 4.33,
  "skillBreakdown": {
    "serve": 4.19,
    "return": 4.56,
    "offense": 4.49,
    "defense": 4.29,
    "agility": 4.28,
    "consistency": 4.15
  },
  "shotTypes": {
    "dinks": 35,
    "drives": 20,
    "drops": 10,
    "serves": 15,
    "volleys": 6
  },
  "courtCoverage": {
    "distanceCovered": 608,
    "courtAreas": {"left": 40, "center": 35, "right": 25}
  },
  "gameInsights": ["insight1", "insight2"]
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

    const finalResponse = {
      success: true,
      shotAccuracy: analysis.shotAccuracy || 0,
      totalShots: analysis.totalShots || 0,
      serve: {
        averageSpeed: analysis.serve?.averageSpeed || 0,
        topSpeed: analysis.serve?.topSpeed || 0,
        percentile: analysis.serve?.percentile || 0,
      },
      drive: {
        averageSpeed: analysis.drive?.averageSpeed || 0,
        topSpeed: analysis.drive?.topSpeed || 0,
        percentile: analysis.drive?.percentile || 0,
      },
      shotQuality: analysis.shotQuality || 0,
      skillRating: analysis.skillRating || 0,
      skillBreakdown: analysis.skillBreakdown || {
        serve: 0,
        return: 0,
        offense: 0,
        defense: 0,
        agility: 0,
        consistency: 0,
      },
      shotTypes: analysis.shotTypes || {
        dinks: 0,
        drives: 0,
        drops: 0,
        serves: 0,
        volleys: 0,
      },
      courtCoverage: analysis.courtCoverage || {
        distanceCovered: 0,
        courtAreas: { left: 0, center: 0, right: 0 },
      },
      gameInsights: analysis.gameInsights || [],
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
