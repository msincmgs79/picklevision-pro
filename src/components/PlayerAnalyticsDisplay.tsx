'use client';

import React, { useState } from 'react';
import { AlertCircle, BarChart3, Users, Zap } from 'lucide-react';

interface PlayerStats {
  primary_zone: string;
  zones_visited: string[];
  frames_detected: number;
  avg_confidence: number;
  duration_seconds: number;
  first_frame: number;
  last_frame: number;
}

interface VideoInfo {
  filename: string;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  duration_seconds: number;
}

interface TrackingResults {
  video_info: VideoInfo;
  players: Record<string, PlayerStats>;
  zones: Record<string, string | null>;
  processing: {
    frames_processed: number;
    detections_total: number;
  };
}

interface Props {
  results: TrackingResults;
  loading?: boolean;
  error?: string;
}

const PlayerAnalyticsDisplay: React.FC<Props> = ({ results, loading, error }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Analyzing video...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-200">Analysis Failed</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const players = Object.entries(results.players);
  const videoInfo = results.video_info;

  return (
    <div className="space-y-6">
      {/* Video Info Summary */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Analysis Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-slate-400 text-sm">Duration</p>
            <p className="text-white font-mono">{videoInfo.duration_seconds.toFixed(1)}s</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Resolution</p>
            <p className="text-white font-mono">{videoInfo.width}x{videoInfo.height}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">FPS</p>
            <p className="text-white font-mono">{videoInfo.fps.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Detections</p>
            <p className="text-white font-mono">{results.processing.detections_total}</p>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Player Analytics
        </h3>

        {players.length === 0 ? (
          <p className="text-slate-400">No players detected</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map(([playerId, stats]) => (
              <div
                key={playerId}
                onClick={() => setSelectedPlayer(selectedPlayer === playerId ? null : playerId)}
                className="bg-slate-800 border border-slate-700 rounded p-4 cursor-pointer hover:border-purple-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white">{playerId.replace('_', ' ').toUpperCase()}</h4>
                  <span className="text-xs bg-purple-900/50 text-purple-200 px-2 py-1 rounded">
                    {(stats.avg_confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Zone:</span>
                    <span className="text-white font-mono">{stats.primary_zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white font-mono">{stats.duration_seconds.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Frames:</span>
                    <span className="text-white font-mono">{stats.frames_detected}</span>
                  </div>
                </div>

                {selectedPlayer === playerId && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Zones Visited:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stats.zones_visited.map((zone) => (
                          <span key={zone} className="bg-slate-700 text-slate-200 px-2 py-1 rounded">
                            {zone}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Confidence: </span>
                      <span className="text-white">{(stats.avg_confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone Distribution */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-400" />
          Zone Distribution
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(results.zones).map(([zone, playerId]) => (
            <div key={zone} className="bg-slate-800 border border-slate-700 rounded p-3">
              <p className="text-slate-400 text-sm">{zone}</p>
              <p className="text-white font-mono">
                {playerId ? playerId.replace('_', ' ').toUpperCase() : 'Empty'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerAnalyticsDisplay;
