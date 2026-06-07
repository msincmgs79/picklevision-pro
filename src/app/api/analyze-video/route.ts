import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveVideoAnalysis } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { frameBase64, videoUrl, userId, videoId } = await request.json();

    if (!frameBase64 && !videoUrl) {
      return Response.json({ success: false, error: 'No input provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ success: false, error: 'API key missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `Analyze this pickleball video and return JSON: {"shotAccuracy":85,"totalShots":86,"serve":{"averageSpeed":61,"topSpeed":69,"percentile":95},"drive":{"averageSpeed":44,"topSpeed":77,"percentile":66},"shotQuality":60,"skillRating":4.33,"skillBreakdown":{"serve":4.19,"return":4.56,"offense":4.49,"defense":4.29,"agility":4.28,"consistency":4.15},"shotTypes":{"dinks":35,"drives":20,"drops":10,"serves":15,"volleys":6},"courtCoverage":{"distanceCovered":608,"courtAreas":{"left":40,"center":35,"right":25}},"gameInsights":["insight1"]}`;

    let content: any[];

    if (videoUrl) {
      // Download video from Firebase URL
      const videoResponse = await fetch(videoUrl);
      const arrayBuffer = await videoResponse.arrayBuffer();
      const base64Video = Buffer.from(arrayBuffer).toString('base64');

      // Send as inline data (supports up to 100MB)
      content = [
        {
          inlineData: {
            mimeType: 'video/mp4',
            data: base64Video
          }
        },
        { text: prompt }
      ];
    } else {
      content = [
        { inlineData: { data: frameBase64, mimeType: 'image/jpeg' } },
        { text: prompt }
      ];
    }

    const response = await model.generateContent(content);
    const text = (response as any).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

    const result = {
      success: true,
      shotAccuracy: analysis.shotAccuracy || 0,
      totalShots: analysis.totalShots || 0,
      serve: analysis.serve || { averageSpeed: 0, topSpeed: 0, percentile: 0 },
      drive: analysis.drive || { averageSpeed: 0, topSpeed: 0, percentile: 0 },
      shotQuality: analysis.shotQuality || 0,
      skillRating: analysis.skillRating || 0,
      skillBreakdown: analysis.skillBreakdown || { serve: 0, return: 0, offense: 0, defense: 0, agility: 0, consistency: 0 },
      shotTypes: analysis.shotTypes || { dinks: 0, drives: 0, drops: 0, serves: 0, volleys: 0 },
      courtCoverage: analysis.courtCoverage || { distanceCovered: 0, courtAreas: { left: 0, center: 0, right: 0 } },
      gameInsights: analysis.gameInsights || [],
    };

    if (userId && videoId) {
      try {
        await saveVideoAnalysis(userId, videoId, result);
      } catch (e) {
        console.error('DB save failed:', e);
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error',
    }, { status: 500 });
  }
}
