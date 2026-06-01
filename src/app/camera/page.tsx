'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Button from '@/components/Button';
import Card from '@/components/Card';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function CameraPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('videos');
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

  useEffect(() => {
    if (!cameraActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (event) => {
          chunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `match-${Date.now()}.webm`;
          a.click();
          chunksRef.current = [];
        };

        mediaRecorderRef.current = mediaRecorder;
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
        <div>Loading...</div>
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

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={() => {}}
          notificationCount={0}
          onNotificationClick={() => console.log('Notifications')}
          onProfileClick={() => router.push('/profile')}
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
            if (itemId === 'billing') router.push('/billing');
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
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>
            Record Match
          </h1>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Record your match in real-time
          </p>
        </div>

        {!cameraActive ? (
          <Card variant="highlighted" shadow="md" padding="lg">
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'white' }}>
                Ready to Record?
              </h2>
              <p style={{ margin: '0 0 24px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                Grant camera access to start recording your match
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setCameraActive(true)}
                style={{ minWidth: '200px' }}
              >
                Start Camera
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {isRecording && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                    {formatTime(recordingTime)}
                  </div>
                )}
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {!isRecording ? (
                <>
                  <Button variant="primary" size="md" fullWidth onClick={startRecording}>
                    ⏺️ Start Recording
                  </Button>
                  <Button variant="secondary" size="md" fullWidth onClick={() => setCameraActive(false)}>
                    ✕ Close Camera
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="danger" size="md" fullWidth onClick={stopRecording}>
                    ⏹️ Stop Recording
                  </Button>
                  <Button variant="secondary" size="md" fullWidth disabled>
                    Recording...
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </PageLayout>
  );
}
