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

    const prompt = `Analyze this pickleball match video and track these specific metrics. Return ONLY valid JSON:
{
  "kitchenTransition": {
    "thirdShotSuccessRate": <0-100 percent>,
    "returnContactDepth": <feet behind baseline>
  },
  "softGame": {
    "deadDinksCount": <number of unattackable dinks>,
    "unforcedErrorsCount": <number of UFE>
  },
  "shotPlacement": {
    "targetingAccuracy": <0-100 percent>
  },
  "hardGame": {
    "speedUpEfficiency": <0-100 percent>,
    "forcedErrorsCaused": <number>
  },
  "netDefense": {
    "resetSuccessPercent": <0-100 percent>,
    "popUpFrequency": <0-100 percent>
  },
  "playerInsights": [<insight string>, <insight string>]
}
Analyze the video carefully and provide realistic estimates. Return ONLY the JSON object, no other text.`;

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
      kitchenTransition: analysis.kitchenTransition || { thirdShotSuccessRate: 0, returnContactDepth: 0 },
      softGame: analysis.softGame || { deadDinksCount: 0, unforcedErrorsCount: 0 },
      shotPlacement: analysis.shotPlacement || { targetingAccuracy: 0 },
      hardGame: analysis.hardGame || { speedUpEfficiency: 0, forcedErrorsCaused: 0 },
      netDefense: analysis.netDefense || { resetSuccessPercent: 0, popUpFrequency: 0 },
      playerInsights: analysis.playerInsights || [],
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
