import { useState, useCallback, useEffect, useRef } from 'react';

interface TrackingState {
  loading: boolean;
  error: string | null;
  results: any | null;
  progress: number;
}

interface UsePlayerTrackerOptions {
  onSuccess?: (results: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for analyzing videos with the player tracker
 *
 * Usage:
 * const { analyzeVideo, loading, error, results } = usePlayerTracker();
 * const analysisResults = await analyzeVideo('/path/to/video.mp4');
 */
export const usePlayerTracker = (options: UsePlayerTrackerOptions = {}) => {
  const [state, setState] = useState<TrackingState>({
    loading: false,
    error: null,
    results: null,
    progress: 0,
  });
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeVideo = useCallback(
    async (videoPath: string) => {
      setState({ loading: true, error: null, results: null, progress: 0 });

      try {
        console.log('[usePlayerTracker] Analyzing:', videoPath);

        // Start polling for progress
        progressIntervalRef.current = setInterval(async () => {
          try {
            const response = await fetch(`/api/track-players?videoPath=${encodeURIComponent(videoPath)}`);
            const data = await response.json();
            if (data.progress !== null) {
              setState((prev) => ({ ...prev, progress: data.progress }));
            }
          } catch (error) {
            console.warn('[usePlayerTracker] Progress query failed:', error);
          }
        }, 500);

        const response = await fetch('/api/track-players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoPath }),
        });

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze video');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Analysis failed');
        }

        setState({
          loading: false,
          error: null,
          results: data.data,
          progress: 100,
        });

        options.onSuccess?.(data.data);

        return data.data;

      } catch (error: any) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        const errorMessage = error.message || 'Unknown error occurred';
        console.error('[usePlayerTracker] Error:', errorMessage);

        setState({
          loading: false,
          error: errorMessage,
          results: null,
          progress: 0,
        });

        options.onError?.(errorMessage);

        throw error;

      }
    },
    [options]
  );

  return {
    analyzeVideo,
    ...state,
  };
};
