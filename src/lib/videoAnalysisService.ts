/**
 * Video Analysis Service - Calls backend API to analyze videos with Claude Vision
 * The actual analysis happens on the server side for security
 */

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
}

/**
 * Analyze complete video for game breakdown by calling the backend API
 */
export async function analyzeGameVideo(videoUrl: string): Promise<VideoAnalysisResult> {
  try {
    console.log('Calling video analysis API for:', videoUrl);

    const response = await fetch('/api/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${error.error}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error('Video analysis failed');
    }

    return result.analysis;
  } catch (error) {
    console.error('Error analyzing video:', error);

    // Return empty result on error
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
