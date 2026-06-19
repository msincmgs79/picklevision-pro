'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getUserVideos } from '@/lib/db';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import TrajectoryVisualization from '@/components/TrajectoryVisualization';

interface BallTrajectory {
  player: 1 | 2;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
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
  const { user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('analytics');

  useEffect(() => {
    if (!user?.uid) return;
    const loadVideos = async () => {
      try {
        const userVideos = await getUserVideos(user.uid);
        setVideos(userVideos);
        if (userVideos.length > 0) {
          setSelectedVideo(userVideos[0]);
        }
      } catch (err) {
        setError('Failed to load videos');
        console.error(err);
      }
    };
    loadVideos();
  }, [user?.uid]);

  useEffect(() => {
    const analyzeVideo = async () => {
      if (!selectedVideo) return;
      setLoading(true);
      setError(null);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: selectedVideo.videoUrl,
            userId: user?.uid,
            videoId: selectedVideo.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          setError(`Server error ${response.status}: ${errorText.substring(0, 100)}`);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setAnalysis(data);
        } else {
          setError(data.error || 'Analysis failed');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError('Request timeout after 2 minutes');
        } else {
          setError('Error analyzing video');
        }
        console.error('[ANALYTICS]', err);
      } finally {
        setLoading(false);
      }
    };
    analyzeVideo();
  }, [selectedVideo, user?.uid]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'videos', label: 'Videos', icon: '🎥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ];

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);
    const routes: Record<string, string> = {
      dashboard: '/',
      videos: '/videos',
      analytics: '/analytics',
      leaderboard: '/leaderboard',
      profile: '/profile',
      billing: '/billing',
    };
    if (routes[itemId]) router.push(routes[itemId]);
  };

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={() => {}}
          notificationCount={2}
          onNotificationClick={() => console.log('Notifications')}
          onProfileClick={() => router.push('/profile')}
          searchPlaceholder="Search videos..."
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span>© 2026 PickleVision Pro</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>Match Analytics</h1>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Detailed pickleball performance metrics</p>
        </div>

        <Card variant="default" shadow="md" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: '600' }}>Select Video</label>
            <select
              value={selectedVideo?.id || ''}
              onChange={(e) => {
                const video = videos.find((v) => v.id === e.target.value);
                setSelectedVideo(video);
              }}
              style={{
                padding: '10px 12px',
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                borderRadius: '6px',
                color: '#00ff88',
                fontSize: '14px',
              }}
            >
              <option value="">Select a video...</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>{video.title || 'Untitled'}</option>
              ))}
            </select>
          </div>
        </Card>

        {loading && (
          <Card variant="default" shadow="md" padding="lg">
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>Analyzing video with Gemini...</p>
          </Card>
        )}

        {error && (
          <Card variant="default" shadow="md" padding="lg">
            <p style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p>
          </Card>
        )}

        {analysis && !loading && (
          <>
            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Kitchen Transition</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>3rd Shot Success Rate</p>
                  <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.kitchenTransition.thirdShotSuccessRate}%</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Return Contact Depth</p>
                  <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.kitchenTransition.returnContactDepth} ft</p>
                </div>
              </div>
            </Card>

            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Soft Game (NVZ)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Dead Dinks</p>
                  <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.softGame.deadDinksCount}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Unforced Errors</p>
                  <p style={{ margin: 0, color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>{analysis.softGame.unforcedErrorsCount}</p>
                </div>
              </div>
            </Card>

            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Shot Placement</h3>
              <div>
                <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Targeting Accuracy</p>
                <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.shotPlacement.targetingAccuracy}%</p>
              </div>
            </Card>

            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Hard Game</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Speed-Up Efficiency</p>
                  <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.hardGame.speedUpEfficiency}%</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Forced Errors Caused</p>
                  <p style={{ margin: 0, color: '#00d4ff', fontSize: '20px', fontWeight: '700' }}>{analysis.hardGame.forcedErrorsCaused}</p>
                </div>
              </div>
            </Card>

            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Net Defense</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Reset Success %</p>
                  <p style={{ margin: 0, color: '#00ff88', fontSize: '20px', fontWeight: '700' }}>{analysis.netDefense.resetSuccessPercent}%</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Pop-Up Frequency</p>
                  <p style={{ margin: 0, color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>{analysis.netDefense.popUpFrequency}%</p>
                </div>
              </div>
            </Card>

            {analysis.playerInsights && analysis.playerInsights.length > 0 && (
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Insights</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analysis.playerInsights.map((insight, i) => (
                    <p key={i} style={{ margin: 0, padding: '12px', background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.15)', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>• {insight}</p>
                  ))}
                </div>
              </Card>
            )}

            {analysis.ballTrajectories && analysis.ballTrajectories.length > 0 && (
              <Card variant="default" shadow="md" padding="lg">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>Ball Trajectories</h3>
                  <div style={{ height: '450px' }}>
                    <TrajectoryVisualization trajectories={analysis.ballTrajectories} viewMode="isometric" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#00ff88' }}>Trajectory Summary</p>
                    <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Total Shots: {analysis.ballTrajectories.length}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Player 1: {analysis.ballTrajectories.filter((t: BallTrajectory) => t.player === 1).length}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Player 2: {analysis.ballTrajectories.filter((t: BallTrajectory) => t.player === 2).length}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#00ff88' }}>View Controls</p>
                    <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Use buttons above to</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>switch view angles</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {!selectedVideo && videos.length === 0 && (
          <Card variant="default" shadow="md" padding="lg">
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>No videos available</p>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>Upload a video to see analytics</p>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
