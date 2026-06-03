'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';

interface Video {
  id: string;
  title: string;
  date: Date;
  duration: number;
  opponent?: string;
  score?: string;
  status: 'pending' | 'processing' | 'analyzed';
  thumbnail?: string;
  fileSize?: number;
}

export default function VideosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [videos, setVideos] = useState<Video[]>([
    {
      id: '1',
      title: 'Match vs Sarah Chen',
      date: new Date('2026-05-28'),
      duration: 42,
      opponent: 'Sarah Chen',
      score: '11-9, 11-7',
      status: 'analyzed',
    },
    {
      id: '2',
      title: 'Practice Rally #3',
      date: new Date('2026-05-25'),
      duration: 15,
      opponent: 'Practice',
      status: 'analyzed',
    },
    {
      id: '3',
      title: 'Tournament Round 2',
      date: new Date('2026-05-20'),
      duration: 38,
      opponent: 'Mike Johnson',
      score: '11-8, 8-11, 11-5',
      status: 'analyzed',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('videos');
  const [pageLoading, setPageLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.opponent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'analyzed' && video.status === 'analyzed') ||
                      (activeTab === 'processing' && video.status === 'processing') ||
                      (activeTab === 'pending' && video.status === 'pending');
    return matchesSearch && matchesTab;
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    if (status === 'analyzed') return 'success';
    if (status === 'processing') return 'warning';
    return 'primary';
  };

  // Handle video analysis
  const handleAnalyze = async (videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (!video) return;

    const updatedVideos = videos.map((v) =>
      v.id === videoId ? { ...v, status: 'processing' as const } : v
    );
    setVideos(updatedVideos);

    // Simulate analysis
    setTimeout(() => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, status: 'analyzed' as const } : v
        )
      );
    }, 3000);
  };

  // Handle video deletion
  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    }
  };

  // Handle video upload
  const handleUploadVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to server
      const response = await fetch('/api/upload-video-temp', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const result = await response.json();

      // Add new video to list
      const newVideo: Video = {
        id: result.videoId || Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        date: new Date(),
        duration: 0,
        status: 'pending',
        fileSize: file.size,
      };

      setVideos((prev) => [newVideo, ...prev]);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'videos', label: 'Videos', icon: '🎥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ];

  // Tab items
  const tabItems = [
    { id: 'all', label: 'All Videos' },
    { id: 'analyzed', label: 'Analyzed' },
    { id: 'processing', label: 'Processing' },
    { id: 'pending', label: 'Pending' },
  ];

  return (
    <PageLayout
      header={<Header logoText="PickleVision Pro" onSearchChange={setSearchQuery} notificationCount={2} onNotificationClick={() => console.log('Notifications')} onProfileClick={() => router.push('/profile')} searchPlaceholder="Search videos..." />}
      sidebar={<Navigation items={navItems} activeItemId={activeNav} onItemClick={(itemId) => { setActiveNav(itemId); if (itemId === 'dashboard') router.push('/'); if (itemId === 'videos') router.push('/videos'); if (itemId === 'analytics') router.push('/analytics'); if (itemId === 'leaderboard') router.push('/leaderboard'); if (itemId === 'profile') router.push('/profile'); if (itemId === 'billing') router.push('/billing'); }} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}><span>© 2026 PickleVision Pro</span><div style={{ display: 'flex', gap: '16px' }}><a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Privacy</a><a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Terms</a></div></div>}
    >
      {pageLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading videos...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>Video Library</h1>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Manage and analyze your recorded matches</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <Card variant="highlighted" shadow="md" padding="lg" hoverable><div><div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Videos</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#00ff88', marginBottom: '4px' }}>{videos.length}</div><div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>All time</div></div></Card>
            <Card variant="highlighted" shadow="md" padding="lg" hoverable><div><div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Analyzed</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#00d4ff', marginBottom: '4px' }}>{videos.filter((v) => v.status === 'analyzed').length}</div><div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>With insights</div></div></Card>
            <Card variant="highlighted" shadow="md" padding="lg" hoverable><div><div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Duration</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>{Math.round(videos.reduce((sum, v) => sum + v.duration, 0) / 60)}h</div><div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Recorded</div></div></Card>
          </div>

          <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} variant="default" size="md" />

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '12px' : '16px', padding: isMobile ? '0 12px' : '0' }}>
            {filteredVideos.map((video) => (
              <Card key={video.id} variant="default" shadow="md" padding="lg" hoverable>
                <div style={{ width: '100%', height: isMobile ? '120px' : '160px', background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 212, 255, 0.1))', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? '8px' : '12px', border: '1px solid rgba(0, 255, 136, 0.2)', fontSize: isMobile ? '36px' : '48px' }}>🎥</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={video.title}>{video.title}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}><span>{video.date.toLocaleDateString()}</span><span>{video.duration} min</span></div>
                {video.opponent && <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>vs {video.opponent}</div>}
                {video.score !== 'N/A' && <div style={{ fontSize: '12px', color: '#00ff88', fontWeight: '600', marginBottom: '12px' }}>Score: {video.score}</div>}
                <div style={{ marginBottom: '12px' }}><Badge variant={getStatusBadgeVariant(video.status)} size="sm">{video.status === 'analyzed' ? '✓ Analyzed' : video.status === 'processing' ? '⟳ Processing' : '⏳ Pending'}</Badge></div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '8px' }}>
                  <button style={{ flex: 1, padding: isMobile ? '6px 8px' : '8px 12px', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '11px' : '12px', fontWeight: '600', transition: 'all 0.2s', lineHeight: '1.2', minHeight: 'auto' }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.2)'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.1)'; }}>▶ Play</button>
                  <button onClick={() => handleAnalyze(video.id)} style={{ flex: 1, padding: isMobile ? '6px 8px' : '8px 12px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#00d4ff', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '11px' : '12px', fontWeight: '600', transition: 'all 0.2s', lineHeight: '1.2', minHeight: 'auto' }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(0, 212, 255, 0.2)'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(0, 212, 255, 0.1)'; }}>{video.status === 'processing' ? '⏳ Processing...' : '📊 Analyze'}</button>
                  <button onClick={() => handleDeleteVideo(video.id)} style={{ flex: 1, padding: isMobile ? '6px 8px' : '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '11px' : '12px', fontWeight: '600', transition: 'all 0.2s', lineHeight: '1.2', minHeight: 'auto' }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.2)'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)'; }}>🗑️ Delete</button>
                </div>
              </Card>
            ))}
          </div>

          {filteredVideos.length === 0 && (
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>No videos found</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>{searchQuery ? 'Try adjusting your search' : 'Upload your first match video to get started'}</p>
              </div>
            </Card>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div onClick={() => fileInputRef.current?.click()} style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              <Button variant="primary" size="md" fullWidth disabled={uploading}>
                🎥 {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleUploadVideo} style={{ display: 'none' }} disabled={uploading} />
            <Button variant="secondary" size="md" fullWidth>
              📁 Manage Library
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
