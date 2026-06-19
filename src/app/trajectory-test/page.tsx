'use client';

import React from 'react';
import TrajectoryVisualization from '@/components/TrajectoryVisualization';

const SAMPLE_TRAJECTORIES = [
  {
    player: 1 as const,
    startPosition: { x: 3, y: 42 },
    endPosition: { x: 10, y: 25 },
    shotType: 'serve',
    zoneStart: 'baseline',
    zoneEnd: 'midcourt',
  },
  {
    player: 2 as const,
    startPosition: { x: 10, y: 25 },
    endPosition: { x: 10, y: 7 },
    shotType: 'third_shot',
    zoneStart: 'midcourt',
    zoneEnd: 'kitchen',
  },
  {
    player: 1 as const,
    startPosition: { x: 10, y: 7 },
    endPosition: { x: 8, y: 5 },
    shotType: 'dink',
    zoneStart: 'kitchen',
    zoneEnd: 'kitchen',
  },
  {
    player: 2 as const,
    startPosition: { x: 8, y: 5 },
    endPosition: { x: 12, y: 10 },
    shotType: 'dink',
    zoneStart: 'kitchen',
    zoneEnd: 'midcourt',
  },
  {
    player: 1 as const,
    startPosition: { x: 12, y: 10 },
    endPosition: { x: 15, y: 30 },
    shotType: 'drive',
    zoneStart: 'midcourt',
    zoneEnd: 'baseline',
  },
  {
    player: 2 as const,
    startPosition: { x: 15, y: 30 },
    endPosition: { x: 10, y: 8 },
    shotType: 'reset',
    zoneStart: 'baseline',
    zoneEnd: 'kitchen',
  },
];

export default function TrajectoryTestPage() {
  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0e27' }}>
      <h1 style={{ color: '#00ff88', marginBottom: '20px' }}>3D Ball Trajectory Test</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
        Testing Three.js 3D visualization with {SAMPLE_TRAJECTORIES.length} sample trajectories
      </p>
      <div style={{ flex: 1, marginBottom: '20px', border: '2px solid #00ff88', borderRadius: '8px', overflow: 'hidden' }}>
        <TrajectoryVisualization trajectories={SAMPLE_TRAJECTORIES} viewMode="isometric" />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
        <p>If you see a 3D court with colored balls and trajectories, Three.js is working!</p>
        <p>Green = Player 1 shots, Red = Player 2 shots</p>
      </div>
    </div>
  );
}
