import { saveVideoAnalysis } from '@/lib/db';

interface BallTrajectory {
  player: 1 | 2;
  playerName: string;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
  inOrOut: 'in' | 'out';
}

interface AnalysisResult {
  success: boolean;
  kitchenTransition: { thirdShotSuccessRate: number; returnContactDepth: number };
  softGame: { deadDinksCount: number; unforcedErrorsCount: number };
  shotPlacement: { targetingAccuracy: number };
  hardGame: { speedUpEfficiency: number; forcedErrorsCaused: number };
  netDefense: { resetSuccessPercent: number; popUpFrequency: number };
  playerInsights: string[];
  ballTrajectories?: BallTrajectory[];
}

export async function POST(request: Request) {
  try {
    const { videoUrl, userId, videoId } = await request.json();

    if (!videoUrl) {
      return Response.json({ success: false, error: 'No video URL' }, { status: 400 });
    }

    console.log('[ANALYZE] Starting 3D Ball Trajectory Analysis');

    // STEP 1: Generate realistic demo ball trajectories for 3D visualization
    console.log('[ANALYZE] Generating demo ball trajectories');

    // Create realistic pickleball trajectories showing typical match patterns
    const demoTrajectories: BallTrajectory[] = [
      // Serve sequence - Player 1
      {
        player: 1,
        playerName: 'Player 1',
        startPosition: { x: 2, y: 8 },
        endPosition: { x: 18, y: 36 },
        shotType: 'serve',
        zoneStart: 'baseline',
        zoneEnd: 'service box',
        inOrOut: 'in' as const,
      },
      // Return - Player 2
      {
        player: 2,
        playerName: 'Player 2',
        startPosition: { x: 18, y: 36 },
        endPosition: { x: 10, y: 14 },
        shotType: 'return',
        zoneStart: 'service box',
        zoneEnd: 'kitchen',
        inOrOut: 'in' as const,
      },
      // Kitchen volley - Player 1
      {
        player: 1,
        playerName: 'Player 1',
        startPosition: { x: 10, y: 14 },
        endPosition: { x: 12, y: 15 },
        shotType: 'dink',
        zoneStart: 'kitchen',
        zoneEnd: 'kitchen',
        inOrOut: 'in' as const,
      },
      // Kitchen volley - Player 2
      {
        player: 2,
        playerName: 'Player 2',
        startPosition: { x: 12, y: 15 },
        endPosition: { x: 8, y: 14 },
        shotType: 'dink',
        zoneStart: 'kitchen',
        zoneEnd: 'kitchen',
        inOrOut: 'in' as const,
      },
      // Speed up - Player 1
      {
        player: 1,
        playerName: 'Player 1',
        startPosition: { x: 8, y: 14 },
        endPosition: { x: 14, y: 26 },
        shotType: 'speed-up',
        zoneStart: 'kitchen',
        zoneEnd: 'baseline',
        inOrOut: 'in' as const,
      },
      // Block/Reset - Player 2
      {
        player: 2,
        playerName: 'Player 2',
        startPosition: { x: 14, y: 26 },
        endPosition: { x: 10, y: 18 },
        shotType: 'reset',
        zoneStart: 'baseline',
        zoneEnd: 'mid-court',
        inOrOut: 'in' as const,
      },
      // Winner - Player 1
      {
        player: 1,
        playerName: 'Player 1',
        startPosition: { x: 10, y: 18 },
        endPosition: { x: 18, y: 32 },
        shotType: 'winner',
        zoneStart: 'mid-court',
        zoneEnd: 'out',
        inOrOut: 'out' as const,
      },
    ];

    const trajectories = demoTrajectories;

    console.log('[ANALYZE] Generated trajectories:', trajectories.length);

    // STEP 2: Build result with demo trajectory data
    const result: AnalysisResult = {
      success: true,
      kitchenTransition: { thirdShotSuccessRate: 72, returnContactDepth: 8.5 },
      softGame: { deadDinksCount: 18, unforcedErrorsCount: 3 },
      shotPlacement: { targetingAccuracy: 76 },
      hardGame: { speedUpEfficiency: 68, forcedErrorsCaused: 2 },
      netDefense: { resetSuccessPercent: 82, popUpFrequency: 35 },
      playerInsights: [
        'Strong dinking game in the kitchen',
        'Excellent net positioning',
        'Quick transitions to speed-up opportunities',
        'Well-timed reset shots'
      ],
      ballTrajectories: trajectories,
    };

    console.log('[ANALYZE] Demo analysis complete:', {
      success: result.success,
      trajectories: trajectories.length,
      note: '3D Visualization enabled with demo ball trajectories'
    });

    // STEP 4: Save to Firestore
    if (userId && videoId) {
      try {
        await saveVideoAnalysis(userId, videoId, result);
        console.log('[ANALYZE] Analysis saved to Firestore');
      } catch (e) {
        console.error('[ANALYZE] Firestore save failed:', e);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[ANALYZE] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}
