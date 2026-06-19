'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import TrajectoryVisualization from '@/components/TrajectoryVisualization';
import { getUserVideoAnalyses } from '@/lib/db';

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

interface GeminiAnalysis {
  success: boolean;
  kitchenTransition?: { thirdShotSuccessRate: number; returnContactDepth: number };
  softGame?: { deadDinksCount: number; unforcedErrorsCount: number };
  shotPlacement?: { targetingAccuracy: number };
  hardGame?: { speedUpEfficiency: number; forcedErrorsCaused: number };
  netDefense?: { resetSuccessPercent: number; popUpFrequency: number };
  playerInsights?: string[];
  ballTrajectories?: BallTrajectory[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      try {
        if (!user?.uid) {
          setLoading(false);
          setError('Please log in to view analytics');
          return;
        }

        console.log('📊 Fetching analysis for user:', user.uid);
        const analyses = await getUserVideoAnalyses(user.uid, 1);
        console.log('📊 Raw data from Firestore:', analyses);
        
        if (analyses.length > 0) {
          const latestAnalysis = analyses[0];
          console.log('📊 Latest analysis structure:', Object.keys(latestAnalysis));
          console.log('📊 Has ballTrajectories?', !!latestAnalysis.ballTrajectories);
          console.log('📊 Has kitchenTransition?', !!latestAnalysis.kitchenTransition);
          
          setAnalysis(latestAnalysis as GeminiAnalysis);
          setError(null);
        } else {
          console.log('⚠️ No analyses found in Firestore');
          setError('No video analysis found. Go to Videos to upload a game.');
          setAnalysis(null);
        }
      } catch (err) {
        console.error('❌ Error fetching analysis:', err);
        setError('Failed to load analysis data');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestAnalysis();
  }, [user?.uid]);

  // Safe getters with defaults
  const thirdShotSuccess = analysis?.kitchenTransition?.thirdShotSuccessRate ?? 0;
  const targetingAccuracy = analysis?.shotPlacement?.targetingAccuracy ?? 0;
  const trajectories = analysis?.ballTrajectories ?? [];

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

        {loading && (
          <Card variant="default" shadow="md" padding="lg">
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Loading your analysis...</p>
          </Card>
        )}

        {error && !loading && (
          <Card variant="default" shadow="md" padding="lg">
            <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>
          </Card>
        )}

        {analysis && !loading && (
          <>
            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>Performance Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>3rd Shot Success</p>
                  <p style={{ margin: '8px 0 0 0', color: '#00ff88', fontSize: '24px', fontWeight: '700' }}>
                    {thirdShotSuccess}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Targeting Accuracy</p>
                  <p style={{ margin: '8px 0 0 0', color: '#00ff88', fontSize: '24px', fontWeight: '700' }}>
                    {targetingAccuracy}%
                  </p>
                </div>
              </div>
            </Card>

            {trajectories.length > 0 && (
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>
                  3D Ball Trajectory Visualization ({trajectories.length} shots detected)
                </h3>
                <div style={{ height: '600px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                  <TrajectoryVisualization
                    trajectories={trajectories}
                    viewMode="isometric"
                  />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
