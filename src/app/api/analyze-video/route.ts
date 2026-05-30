import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { videoBase64 } = await request.json();

    if (!videoBase64) {
      return Response.json({ success: false, error: 'No video' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const response = await model.generateContent([
      { inlineData: { data: videoBase64, mimeType: 'video/mp4' } },
      { text: `Analyze this pickleball video. Return ONLY JSON:
{"playerColors": [
  {"id":1,"shirtColor":"Color","shortsColor":"Color"},
  {"id":2,"shirtColor":"Color","shortsColor":"Color"},
  {"id":3,"shirtColor":"Color","shortsColor":"Color"},
  {"id":4,"shirtColor":"Color","shortsColor":"Color"}
]}
Colors: Red,Blue,Black,White,Navy,Gray,Orange,Purple,Yellow,Green,Khaki` }
    ]);

    const resp = response as any;
    let text = resp.candidates?.[0]?.content?.parts?.[0]?.text ||
               (typeof resp.text === 'function' ? resp.text() : resp.text);

    if (!text) throw new Error('No response');

    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

    return Response.json({
      success: true,
      analysis: {
        shotSummary: { dinks: 0, drives: 0, drops: 0, lobs: 0, volleys: 0, smashes: 0, serves: 0 },
        playerTechnique: { footwork: 3, positioning: 3, consistency: 60 },
        gameStyle: 'balanced',
        gameInsights: ['Analyzed'],
        totalShots: 0,
        playerColors: json.playerColors || [],
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
