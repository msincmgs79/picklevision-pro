'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getUserVideos } from '@/lib/db';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';

interface AnalysisData {
  shotAccuracy: number;
  totalShots: number;
  serve: { averageSpeed: number; topSpeed: number; percentile: number };
  drive: { averageSpeed: number; topSpeed: number; percentile: number };
  shotQuality: number;
  skillRating: number;
  skillBreakdown: {
    serve: number;
    return: number;
    offense: number;
    defense: number;
    agility: number;
    consistency: number;
  };
  shotTypes: {
    dinks: number;
    drives: number;
    drops: number;
    serves: number;
    volleys: number;
  };
  courtCoverage: {
    distanceCovered: number;
    courtAreas: { left: number; center: number; right: number };
  };
  gameInsights: string[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('analytics');

  // Fetch videos on load
  useEffect(() => {
    if (!user?.uid) return;
    const loadVideos = async () => {
      try {
        const userVideos = await getUserVideos(user.uid);
        setVideos(userVideos);
        if (userVideos.length > 0) {
          setSelectedVideo(userVideos[0]);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
      }
    };
    loadVideos();
  }, [user?.uid]);

  // Load analysis for selected video
  useEffect(() => {
    const loadAnalysis = async () => {
      if (!selectedVideo) return;
      setLoading(true);
      try {
        const response = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: selectedVideo.id,
            userId: user?.uid,
            frameBase64: selectedVideo.videoUrl, // In real scenario, extract frame from video
          }),
        });
        const data = await response.json();
        if (data.success) {
          setAnalysis(data);
        }
      } catch (error) {
        console.error('Error analyzing video:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalysis();
  }, [selectedVideo]);

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
          onSearchChange={setSearchQuery}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <span>© 2026 PickleVision Pro</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>
              Privacy
            </a>
            <a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>
              Terms
            </a>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>
            Match Analytics
          </h1>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Analyze your performance data
          </p>
        </div>

        {/* Video Selection */}
        <Card variant="default" shadow="md" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: '600' }}>
              Select Video
            </label>
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
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card variant="default" shadow="md" padding="lg">
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
              Analyzing video...
            </p>
          </Card>
        )}

        {/* Analytics Display */}
        {analysis && !loading && (
          <>
            {/* Shot Accuracy */}
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>
                  Shot Accuracy
                </h3>
                <span style={{ color: '#00ff88', fontSize: '24px', fontWeight: '700' }}>
                  {analysis.shotAccuracy}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'rgba(0, 255, 136, 0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${analysis.shotAccuracy}%`,
                    background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <p style={{ margin: '12px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                {analysis.totalShots} total shots
              </p>
            </Card>

            {/* Serve & Drive Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {/* Serve */}
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                  Serve
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Average Speed
                    </p>
                    <p style={{ margin: 0, color: '#00ff88', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.serve.averageSpeed} km/h
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Top Speed
                    </p>
                    <p style={{ margin: 0, color: '#00d4ff', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.serve.topSpeed} km/h
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Percentile
                    </p>
                    <p style={{ margin: 0, color: '#f59e0b', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.serve.percentile}th
                    </p>
                  </div>
                </div>
              </Card>

              {/* Drive */}
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                  Drive
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Average Speed
                    </p>
                    <p style={{ margin: 0, color: '#00ff88', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.drive.averageSpeed} km/h
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Top Speed
                    </p>
                    <p style={{ margin: 0, color: '#00d4ff', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.drive.topSpeed} km/h
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Percentile
                    </p>
                    <p style={{ margin: 0, color: '#f59e0b', fontSize: '18px', fontWeight: '700' }}>
                      {analysis.drive.percentile}th
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Shot Quality */}
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>
                  Shot Quality
                </h3>
                <span style={{ color: '#f59e0b', fontSize: '24px', fontWeight: '700' }}>
                  {analysis.shotQuality}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${analysis.shotQuality}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </Card>

            {/* Skill Rating */}
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Single Game Skill Rating
                </p>
                <p style={{ margin: 0, color: '#00ff88', fontSize: '48px', fontWeight: '700' }}>
                  {analysis.skillRating.toFixed(2)}
                </p>
              </div>

              {/* Skill Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {Object.entries(analysis.skillBreakdown).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      padding: '12px',
                      background: 'rgba(0, 255, 136, 0.08)',
                      border: '1px solid rgba(0, 255, 136, 0.15)',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 6px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', textTransform: 'capitalize' }}>
                      {key}
                    </p>
                    <p style={{ margin: 0, color: '#00ff88', fontSize: '16px', fontWeight: '700' }}>
                      {value.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Court Coverage */}
            <Card variant="default" shadow="md" padding="lg">
              <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                Court Coverage
              </h3>
              <p style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                Distance Covered: {analysis.courtCoverage.distanceCovered} ft
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {Object.entries(analysis.courtCoverage.courtAreas).map(([area, percentage]) => (
                  <div key={area} style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', textTransform: 'capitalize' }}>
                      {area}
                    </p>
                    <div
                      style={{
                        width: '100%',
                        height: '60px',
                        background: 'rgba(0, 255, 136, 0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                        border: '1px solid rgba(0, 255, 136, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${(percentage as number) * 0.6}px`,
                          background: 'linear-gradient(180deg, #00ff88, #00d4ff)',
                        }}
                      />
                    </div>
                    <p style={{ margin: '8px 0 0 0', color: '#00ff88', fontSize: '14px', fontWeight: '600' }}>
                      {percentage}%
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Game Insights */}
            {analysis.gameInsights && analysis.gameInsights.length > 0 && (
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                  Coaching Insights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analysis.gameInsights.map((insight, i) => (
                    <p
                      key={i}
                      style={{
                        margin: 0,
                        padding: '12px',
                        background: 'rgba(0, 255, 136, 0.08)',
                        border: '1px solid rgba(0, 255, 136, 0.15)',
                        borderRadius: '6px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '13px',
                      }}
                    >
                      • {insight}
                    </p>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* No Video Selected */}
        {!selectedVideo && videos.length === 0 && (
          <Card variant="default" shadow="md" padding="lg">
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                No videos available
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                Upload a video to see analytics
              </p>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
