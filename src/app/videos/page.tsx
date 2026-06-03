'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile, getUserVideoAnalyses, deleteVideo, saveVideoAnalysis } from '@/lib/db';
import type { User } from '@/lib/db';
import { analyzeMatchVideo, type MatchAnalysis } from '@/lib/shotAnalysis';
import { extractFrameFromVideoBlob } from '@/lib/shotAnalysis';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  videoUrl?: string;
}

export default function VideosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('videos');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleAnalyze = async (videoId: string) => {
    if (!user) return;
    try {
      console.log('🔍 Starting video analysis for:', videoId);

      const video = videos.find((v) => v.id === videoId);
      if (!video) {
        console.error('❌ Video not found in state');
        return;
      }
      if (!video.videoUrl) {
        console.error('❌ Video URL is missing');
        alert('Video URL is not available. Cannot analyze.');
        return;
      }

      setVideos(videos.map((v) => (v.id === videoId ? { ...v, status: 'processing' } : v)));

      console.log('📥 Fetching video from backend API...');
      let blob: Blob;
      try {
        const apiResponse = await fetch('/api/fetch-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: video.videoUrl }),
        });
        if (!apiResponse.ok) throw new Error(`API error: ${apiResponse.status}`);
        const apiData = await apiResponse.json();
        if (!apiData.success) throw new Error(apiData.error);

        // Convert base64 back to blob
        const binaryString = atob(apiData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'video/mp4' });
        console.log('✅ Video fetched successfully:', apiData.size, 'bytes');
      } catch (fetchError) {
        console.error('❌ Failed to fetch video:', fetchError);
        throw new Error(`Failed to fetch video: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      console.log('🎬 Extracting frame from video...');
      let frameBase64: string;
      try {
        const framePromise = extractFrameFromVideoBlob(blob);
        frameBase64 = await Promise.race([
          framePromise,
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Frame extraction timeout after 30s')), 30000)),
        ]);
        console.log('✅ Frame extracted, base64 length:', frameBase64.length);
      } catch (frameError) {
        console.error('❌ Failed to extract frame:', frameError);
        throw new Error(`Failed to extract frame: ${frameError instanceof Error ? frameError.message : 'Unknown error'}`);
      }

      console.log('🤖 Analyzing video with AI...');
      let analysis: MatchAnalysis;
      try {
        const analysisPromise = analyzeMatchVideo(frameBase64);
        analysis = await Promise.race<MatchAnalysis>([
          analysisPromise,
          new Promise<MatchAnalysis>((_, reject) => setTimeout(() => reject(new Error('Analysis timeout after 60s')), 60000)),
        ]);
        console.log('✅ Video analysis complete');
      } catch (analysisError) {
        console.error('❌ Failed to analyze video:', analysisError);
        throw new Error(`Failed to analyze video: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
      }

      console.log('💾 Saving analysis to Firestore...');
      try {
        await saveVideoAnalysis(user.uid, videoId, {
          ...analysis,
          videoId,
          title: video.title,
          status: 'analyzed',
          recordedDate: video.date,
          opponent: video.opponent,
          score: video.score,
          duration: video.duration,
          fileSize: video.fileSize,
          videoUrl: video.videoUrl,
        });
        console.log('✅ Analysis saved to Firestore');
      } catch (saveError) {
        console.error('❌ Failed to save analysis:', saveError);
        throw new Error(`Failed to save analysis: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }

      setVideos(videos.map((v) => (v.id === videoId ? { ...v, status: 'analyzed' } : v)));
      console.log('✅ Video analysis workflow complete');
    } catch (error) {
      console.error('❌ Error analyzing video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis';
      alert(`Video analysis failed: ${errorMessage}`);
      setVideos(videos.map((v) => (v.id === videoId ? { ...v, status: 'pending' } : v)));
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;
    try {
      await deleteVideo(videoId, '', user.uid);
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
        videoUrl: analysis.videoUrl,
      }));
      setVideos(formattedVideos);
    }
  };

  const handleUploadVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      console.log('📤 Starting video upload:', file.name);
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a valid video file');
      }
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Video file too large. Maximum size is 500MB.');
      }

      const timestamp = Date.now();
      const videoFileName = `${user.uid}/${timestamp}_${file.name}`;

      console.log('🔼 Uploading to Cloud Storage...');
      const videoRef = ref(storage, `videos/${videoFileName}`);
      await uploadBytes(videoRef, file);
      const videoUrl = await getDownloadURL(videoRef);
      console.log('✅ Video uploaded successfully');

      const videoId = `video_${timestamp}`;
      const newVideo: VideoFile = {
        id: videoId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        date: new Date(),
        duration: 0,
        fileSize: Math.round(file.size / 1024 / 1024),
        status: 'pending',
        opponent: 'TBD',
        score: '0-0',
        videoUrl: videoUrl,
      };

      console.log('💾 Saving video metadata to Firestore...');
      await saveVideoAnalysis(user.uid, videoId, {
        videoUrl: videoUrl,
        analysisDate: new Date().toISOString(),
        shotBreakdown: { totalShots: 0, shotCounts: { dinks: 0, drives: 0, drops: 0, lobs: 0, volleys: 0, smashes: 0, serves: 0, unknown: 0 }, effectivenessScore: 0, aggressivenessScore: 0 },
        detectedShots: [],
        techniqueAnalysis: { footwork: { rating: 0, feedback: '' }, positioning: { rating: 0, feedback: '' }, racketTechnique: { rating: 0, feedback: '' }, balance: { rating: 0, feedback: '' } },
        proComparison: { overallRating: 0, comparisonToProAverage: '', strengths: [], improvementAreas: [], proStyleMatch: '' },
        coachingTips: [],
        overallInsights: '',
        rallySummary: { totalRallies: 0, avgRallyLength: 0, longestRally: 0, winPercentage: 0 },
        videoId: videoId,
        title: newVideo.title,
        status: 'pending',
        recordedDate: new Date(),
        opponent: newVideo.opponent,
        score: newVideo.score,
        duration: newVideo.duration,
        fileSize: newVideo.fileSize,
      });
      console.log('✅ Video metadata saved');

      setVideos([newVideo, ...videos]);
      alert('✅ Video uploaded successfully! Click "Analyze" to process it.');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during upload';
      alert(`❌ Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
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
          videoUrl: analysis.videoUrl,
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>PickleVision Pro</div>
          <div style={{ width: '48px', height: '48px', border: '3px solid rgba(0, 255, 136, 0.3)', borderTop: '3px solid #00ff88', borderRadius: '50%' }} />
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
    { id: 'billing', label: 'Unlock Features', icon: '⭐' },
  ];

  const tabItems = [
    { id: 'all', label: 'All Videos', icon: undefined },
    { id: 'recent', label: 'Recent', icon: undefined },
    { id: 'analyzed', label: 'Analyzed', icon: undefined },
    { id: 'favorites', label: 'Favorites', icon: undefined },
  ];

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) || video.opponent?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'recent') return matchesSearch && new Date().getTime() - video.date.getTime() < 7 * 24 * 60 * 60 * 1000;
    if (activeTab === 'analyzed') return matchesSearch && video.status === 'analyzed';
    if (activeTab === 'favorites') return matchesSearch && [1, 3, 5].includes(parseInt(video.id));
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'analyzed': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'secondary';
      default: return 'primary';
    }
  };

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
