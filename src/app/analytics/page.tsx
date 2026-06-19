'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import TrajectoryVisualization from '@/components/TrajectoryVisualization';

interface BallTrajectory {
  player: 1 | 2;
  playerName: string;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
  inOrOut: string;
}

interface GeminiAnalysis {
  success: boolean;
  kitchenTransition: { thirdShotSuccessRate: number; returnContactDepth: number };
  softGame: { deadDinksCount: number; unforcedErrorsCount: number };
  shotPlacement: { targetingAccuracy: number };
  hardGame: { speedUpEfficiency: number; forcedErrorsCaused: number };
  netDefense: { resetSuccessPercent: number; popUpFrequency: number };
  playerInsights: string[];
  ballTrajectories?: BallTrajectory[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const routes: { [key: string]: string } = {
    dashboard: '/dashboard',
    videos: '/videos',
    analytics: '/analytics',
    leaderboard: '/leaderboard',
    profile: '/profile',
  };

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);
    if (routes[itemId]) router.push(routes[itemId]);
  };

  const sampleAnalysis: GeminiAnalysis = {
    success: true,
    kitchenTransition: { thirdShotSuccessRate: 72, returnContactDepth: 8.5 },
    softGame: { deadDinksCount: 24, unforcedErrorsCount: 8 },
    shotPlacement: { targetingAccuracy: 81 },
    hardGame: { speedUpEfficiency: 63, forcedErrorsCaused: 6 },
    netDefense: { resetSuccessPercent: 78, popUpFrequency: 45 },
    playerInsights: ['Strong kitchen game', 'Good court positioning'],
    ballTrajectories: [],
  };

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={() => {}}
          notificationCount={0}
          onNotificationClick={() => {}}
          onProfileClick={() => router.push('/profile')}
          searchPlaceholder="Search..."
        />
      }
      sidebar={
        <Navigation
          items={navItems}
          activeItemId={activeNav}
          onItemClick={handleNavClick}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span>© 2026 PickleVision Pro</span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: 'white' }}>Analytics</h1>

        <Card variant="default" shadow="md" padding="lg">
          <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>Performance Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>3rd Shot Success</p>
              <p style={{ margin: '8px 0 0 0', color: '#00ff88', fontSize: '24px', fontWeight: '700' }}>
                {sampleAnalysis.kitchenTransition.thirdShotSuccessRate}%
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Targeting Accuracy</p>
              <p style={{ margin: '8px 0 0 0', color: '#00ff88', fontSize: '24px', fontWeight: '700' }}>
                {sampleAnalysis.shotPlacement.targetingAccuracy}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
