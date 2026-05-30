/**
 * Video Analysis Service - Analyzes extracted video frames with Claude Vision
 */

export interface PlayerColor {
  id: number;
  shirtColor: string;
  shortsColor: string;
}

export interface VideoAnalysisResult {
  shotSummary: {
    dinks: number;
    drives: number;
    drops: number;
    lobs: number;
    volleys: number;
    smashes: number;
    serves: number;
  };
  playerTechnique: {
    footwork: number;
    positioning: number;
    consistency: number;
  };
  gameStyle: 'aggressive' | 'defensive' | 'balanced';
  gameInsights: string[];
  totalShots: number;
  playerColors?: PlayerColor[];
}

export async function analyzeGameVideo(frameBase64: string): Promise<VideoAnalysisResult> {
  try {
    console.log('Calling video analysis API with frame data');
    const response = await fetch('/api/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frameBase64 }),
    });
    if (!response.ok) {
      const error = await response.json();
      const errorMsg = error.details ? `${error.error} - ${error.details}` : error.error;
      throw new Error(`API error: ${errorMsg}`);
    }
    const result = await response.json();
    if (!result.success) {
      const details = result.details ? ` - ${result.details}` : '';
      throw new Error(`Video analysis failed${details}`);
    }
    return result.analysis;
  } catch (error) {
    console.error('Error analyzing video:', error);
    return {
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
        footwork: 0,
        positioning: 0,
        consistency: 0,
      },
      gameStyle: 'balanced',
      gameInsights: ['Video analysis could not be completed. Please try again.'],
      totalShots: 0,
    };
  }
}
