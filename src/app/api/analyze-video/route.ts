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

    const prompt = 'Analyze this pickleball video. Return ONLY JSON with no markdown: {kitchenTransition:{thirdShotSuccessRate:65,returnContactDepth:8.5},softGame:{deadDinksCount:12,unforcedErrorsCount:5},shotPlacement:{targetingAccuracy:72},hardGame:{speedUpEfficiency:58,forcedErrorsCaused:7},netDefense:{resetSuccessPercent:81,popUpFrequency:35},playerInsights:[]}. Fill in realistic values.';

    let content: any[];

    if (videoUrl) {
      const videoResponse = await fetch(videoUrl);
      const arrayBuffer = await videoResponse.arrayBuffer();
      const base64Video = Buffer.from(arrayBuffer).toString('base64');

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
