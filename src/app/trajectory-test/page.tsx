'use client';

import React from 'react';
import TrajectoryVisualization from '@/components/TrajectoryVisualization';

const SAMPLE_TRAJECTORIES = [
  {
    player: 1 as const,
    playerName: 'Player 1',
    startPosition: { x: 3, y: 42 },
    endPosition: { x: 10, y: 25 },
    shotType: 'serve',
    zoneStart: 'baseline',
    zoneEnd: 'midcourt',
    inOrOut: 'in' as const,
  },
  {
    player: 2 as const,
    playerName: 'Player 2',
    startPosition: { x: 10, y: 25 },
    endPosition: { x: 10, y: 7 },
    shotType: 'third_shot',
    zoneStart: 'midcourt',
    zoneEnd: 'kitchen',
    inOrOut: 'in' as const,
  },
];

export default function TrajectoryTestPage() {
  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0e27' }}>
      <h1 style={{ color: '#00ff88', marginBottom: '20px' }}>3D Ball Trajectory Test</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>Testing 3D visualization</p>
      <div style={{ flex: 1, marginBottom: '20px', border: '2px solid #00ff88', borderRadius: '8px', overflow: 'hidden' }}>
        <TrajectoryVisualization trajectories={SAMPLE_TRAJECTORIES} viewMode="isometric" />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
        <p>Green = Player 1, Red = Player 2</p>
      </div>
    </div>
  );
}
