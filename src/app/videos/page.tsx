'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile, getUserVideoAnalyses } from '@/lib/db';
import type { User } from '@/lib/db';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';
import Button from '@/components/Button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface VideoFile {
  id: string;
  title: string;
  date: Date;
  duration: number;
  fileSize: number;
  status: 'analyzed' | 'pending' | 'processing';
  opponent?: string;
  score?: string;
}

export default function VideosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('videos');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;
    try {
      setVideos(videos.filter((v) => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      const analyses = await getUserVideoAnalyses(user.uid);
      const formattedVideos: VideoFile[] = (analyses || []).map((analysis: any) => ({
        id: analysis.id,
        title: analysis.title || 'Video',
        date: analysis.recordedDate?.toDate?.() || new Date(),
        duration: Math.round(analysis.duration || 0),
        fileSize: Math.round((analysis.fileSize || 0) / 1024 / 1024),
        status: analysis.status || 'analyzed',
        opponent: analysis.opponent || 'Unknown',
        score: analysis.score || 'N/A',
      }));
      setVideos(formattedVideos);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);

        const analyses = await getUserVideoAnalyses(user.uid);
        const formattedVideos: VideoFile[] = (analyses || []).map((analysis: any) => ({
          id: analysis.id,
          title: analysis.title || 'Video',
          date: analysis.recordedDate?.toDate?.() || new Date(),
          duration: Math.round(analysis.duration || 0),
          fileSize: Math.round((analysis.fileSize || 0) / 1024 / 1024),
          status: analysis.status || 'analyzed',
          opponent: analysis.opponent || 'Unknown',
          score: analysis.score || 'N/A',
        }));
        setVideos(formattedVideos);
      } catch (error) {
        console.error('Error loading user data:', error);
        setVideos([]);
      } finally {
        setPageLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)',
          color: 'white',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>
            PickleVision Pro
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(0, 255, 136, 0.3)',
              borderTop: '3px solid #00ff88',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'videos', label: 'Videos', icon: '🎥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const tabItems = [
    { id: 'all', label: 'All Videos', icon: undefined },
    { id: 'recent', label: 'Recent', icon: undefined },
    { id: 'analyzed', label: 'Analyzed', icon: undefined },
    { id: 'favorites', label: 'Favorites', icon: undefined },
  ];

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.opponent?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'recent') {
      return (
        matchesSearch &&
        new Date().getTime() - video.date.getTime() < 7 * 24 * 60 * 60 * 1000
      );
    }
    if (activeTab === 'analyzed') {
      return matchesSearch && video.status === 'analyzed';
    }
    if (activeTab === 'favorites') {
      return matchesSearch && [1, 3, 5].includes(parseInt(video.id));
    }
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'secondary';
      default:
        return 'primary';
    }
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
          onItemClick={(itemId) => {
            setActiveNav(itemId);
            if (itemId === 'dashboard') router.push('/');
            if (itemId === 'videos') router.push('/videos');
            if (itemId === 'analytics') router.push('/analytics');
            if (itemId === 'leaderboard') router.push('/leaderboard');
            if (itemId === 'profile') router.push('/profile');
          }}
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
      {pageLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading videos...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: '28px',
                fontWeight: '600',
                color: 'white',
              }}
            >
              Video Library
            </h1>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Manage and analyze your recorded matches
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}
          >
            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Total Videos
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#00ff88',
                    marginBottom: '4px',
                  }}
                >
                  {videos.length}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  All time
                </div>
              </div>
            </Card>

            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Analyzed
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#00d4ff',
                    marginBottom: '4px',
                  }}
                >
                  {videos.filter((v) => v.status === 'analyzed').length}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  With insights
                </div>
              </div>
            </Card>

            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Total Duration
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#f59e0b',
                    marginBottom: '4px',
                  }}
                >
                  {Math.round(videos.reduce((sum, v) => sum + v.duration, 0) / 60)}h
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Recorded
                </div>
              </div>
            </Card>
          </div>

          <Tabs
            items={tabItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="default"
            size="md"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: isMobile ? '12px' : '16px',
              padding: isMobile ? '0 12px' : '0',
            }}
          >
            {filteredVideos.map((video) => (
              <Card key={video.id} variant="default" shadow="md" padding="lg" hoverable>
                <div
                  style={{
                    width: '100%',
                    height: isMobile ? '120px' : '160px',
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 212, 255, 0.1))',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: isMobile ? '8px' : '12px',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    fontSize: isMobile ? '36px' : '48px',
                  }}
                >
                  🎥
                </div>

                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={video.title}
                >
                  {video.title}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  <span>{video.date.toLocaleDateString()}</span>
                  <span>{video.duration} min</span>
                </div>

                {video.opponent && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '8px',
                    }}
                  >
                    vs {video.opponent}
                  </div>
                )}

                {video.score !== 'N/A' && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#00ff88',
                      fontWeight: '600',
                      marginBottom: '12px',
                    }}
                  >
                    Score: {video.score}
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <Badge variant={getStatusBadgeVariant(video.status)} size="sm">
                    {video.status === 'analyzed'
                      ? '✓ Analyzed'
                      : video.status === 'processing'
                        ? '⟳ Processing'
                        : '⏳ Pending'}
                  </Badge>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '4px' : '8px',
                  }}
                >
                  <button
                    style={{
                      flex: 1,
                      padding: isMobile ? '2px 3px' : '8px 12px',
                      background: 'rgba(0, 255, 136, 0.1)',
                      border: isMobile ? 'none' : '1px solid rgba(0, 255, 136, 0.3)',
                      color: '#00ff88',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '8px' : '12px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      lineHeight: '1',
                      minHeight: isMobile ? '20px' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.1)';
                    }}
                  >
                    {isMobile ? 'P' : '▶ Play'}
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: isMobile ? '2px 3px' : '8px 12px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: isMobile ? 'none' : '1px solid rgba(0, 212, 255, 0.3)',
                      color: '#00d4ff',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '8px' : '12px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      lineHeight: '1',
                      minHeight: isMobile ? '20px' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(0, 212, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(0, 212, 255, 0.1)';
                    }}
                  >
                    {isMobile ? 'A' : '📊 Analyze'}
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    style={{
                      flex: 1,
                      padding: isMobile ? '2px 3px' : '8px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: isMobile ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '8px' : '12px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      lineHeight: '1',
                      minHeight: isMobile ? '20px' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    {isMobile ? 'D' : '🗑️ Delete'}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {filteredVideos.length === 0 && (
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                  No videos found
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                  {searchQuery ? 'Try adjusting your search' : 'Upload your first match video to get started'}
                </p>
              </div>
            </Card>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            <Button variant="primary" size="md" fullWidth>
              🎥 Upload Video
            </Button>
            <Button variant="secondary" size="md" fullWidth>
              📁 Manage Library
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
