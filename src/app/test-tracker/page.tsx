'use client';

import { useState } from 'react';
import { usePlayerTracker } from '@/hooks/usePlayerTracker';
import PlayerAnalyticsDisplay from '@/components/PlayerAnalyticsDisplay';

export default function TestTrackerPage() {
  const [videoPath, setVideoPath] = useState('C:\\Users\\marti\\picklevision-pro\\tracked_game.mp4');
  const { analyzeVideo, loading, error, results } = usePlayerTracker();

  const handleAnalyze = async () => {
    try {
      await analyzeVideo(videoPath);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Player Tracker Test</h1>
          <p className="text-slate-400 mb-6">Test the player tracking integration</p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              Video Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                placeholder="Enter video path"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-6 py-2 rounded font-semibold transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Example: C:\Users\marti\picklevision-pro\tracked_game.mp4
            </p>
          </div>
        </div>

        {/* Quick info */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">ℹ️ How it works</h3>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>Enter the path to your video file</li>
            <li>Click "Analyze" button</li>
            <li>Wait for processing (2-4 minutes for 60s video)</li>
            <li>View player analytics below</li>
          </ol>
        </div>

        {/* Results */}
        <PlayerAnalyticsDisplay
          results={results}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
