'use client';

import React from 'react';

interface CourtHeatmapProps {
  zones?: {
    'P1-Front-Left': number;
    'P2-Front-Right': number;
    'P3-Back-Left': number;
    'P4-Back-Right': number;
  };
}

export default function CourtHeatmap({ zones = { 'P1-Front-Left': 0, 'P2-Front-Right': 0, 'P3-Back-Left': 0, 'P4-Back-Right': 0 } }: CourtHeatmapProps) {
  // Calculate max for color intensity
  const maxDetections = Math.max(...Object.values(zones), 1);

  // Function to get color intensity based on detections
  const getHeatColor = (count: number): string => {
    const intensity = Math.min(count / maxDetections, 1);
    if (intensity === 0) return '#f3f4f6'; // gray-100
    if (intensity < 0.25) return '#dcfce7'; // green-100
    if (intensity < 0.5) return '#86efac'; // green-300
    if (intensity < 0.75) return '#22c55e'; // green-500
    return '#15803d'; // green-900
  };

  return (
    <div className="w-full bg-white rounded-lg p-4 border border-gray-200">
      <h3 className="text-sm font-bold text-gray-900 mb-4">COURT HEATMAP</h3>

      {/* Court visualization */}
      <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200 aspect-video flex flex-col">
        {/* Top half (P1 and P2) */}
        <div className="flex-1 flex gap-2 mb-2">
          {/* P1 - Front Left */}
          <div
            className="flex-1 rounded flex items-center justify-center font-bold text-sm transition-all"
            style={{
              backgroundColor: getHeatColor(zones['P1-Front-Left']),
              border: '2px solid rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-600">P1</div>
              <div className="text-lg font-bold text-gray-800">{zones['P1-Front-Left']}</div>
            </div>
          </div>

          {/* P2 - Front Right */}
          <div
            className="flex-1 rounded flex items-center justify-center font-bold text-sm transition-all"
            style={{
              backgroundColor: getHeatColor(zones['P2-Front-Right']),
              border: '2px solid rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-600">P2</div>
              <div className="text-lg font-bold text-gray-800">{zones['P2-Front-Right']}</div>
            </div>
          </div>
        </div>

        {/* Center line */}
        <div className="h-1 bg-amber-300 mb-2"></div>

        {/* Bottom half (P3 and P4) */}
        <div className="flex-1 flex gap-2">
          {/* P3 - Back Left */}
          <div
            className="flex-1 rounded flex items-center justify-center font-bold text-sm transition-all"
            style={{
              backgroundColor: getHeatColor(zones['P3-Back-Left']),
              border: '2px solid rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-600">P3</div>
              <div className="text-lg font-bold text-gray-800">{zones['P3-Back-Left']}</div>
            </div>
          </div>

          {/* P4 - Back Right */}
          <div
            className="flex-1 rounded flex items-center justify-center font-bold text-sm transition-all"
            style={{
              backgroundColor: getHeatColor(zones['P4-Back-Right']),
              border: '2px solid rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-600">P4</div>
              <div className="text-lg font-bold text-gray-800">{zones['P4-Back-Right']}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-5 gap-1 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f3f4f6' }}></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#dcfce7' }}></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#86efac' }}></div>
          <span>Med</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#15803d' }}></div>
          <span>Max</span>
        </div>
      </div>
    </div>
  );
}
