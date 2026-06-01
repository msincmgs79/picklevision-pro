'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile } from '@/lib/db';
import type { User } from '@/lib/db';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import Tabs from '@/components/Tabs';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('analytics');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user data:', error);
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
    { id: 'billing', label: 'Unlock Features', icon: '⭐' },
  ];

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: undefined },
    { id: 'shots', label: 'Shot Analysis', icon: undefined },
    { id: 'technique', label: 'Technique', icon: undefined },
    { id: 'trends', label: 'Trends', icon: undefined },
  ];

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={() => {}}
          notificationCount={3}
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading analytics...</p>
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
              Analytics Dashboard
            </h1>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Comprehensive performance metrics and insights
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                  Total Shots
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#00ff88',
                    marginBottom: '4px',
                  }}
                >
                  487
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Across all matches
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
                  Avg Rally Length
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#00d4ff',
                    marginBottom: '4px',
                  }}
                >
                  8.2
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  shots per rally
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
                  Consistency
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#22c55e',
                    marginBottom: '4px',
                  }}
                >
                  78%
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Shot accuracy
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
                  Top Shot
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#f59e0b',
                    marginBottom: '4px',
                  }}
                >
                  Dink
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  38% of shots
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

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="default" shadow="md" padding="lg">
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Rating Trend
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '4px',
                    height: '120px',
                  }}
                >
                  {[45, 52, 58, 65, 70, 75, 80, 85].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        background: 'linear-gradient(180deg, #00ff88, #00d4ff)',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center',
                  }}
                >
                  Last 8 matches
                </div>
              </Card>

              <Card variant="default" shadow="md" padding="lg">
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Technique Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Footwork', value: 72 },
                    { label: 'Positioning', value: 75 },
                    { label: 'Consistency', value: 78 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {item.label}
                        </span>
                        <span style={{ color: '#00ff88', fontWeight: '600' }}>
                          {item.value}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          background: 'rgba(0, 255, 136, 0.2)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                            width: `${item.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'shots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Shot Type Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Dink', value: 38, color: '#f59e0b' },
                    { label: 'Drive', value: 28, color: '#ef4444' },
                    { label: 'Volley', value: 22, color: '#00d4ff' },
                    { label: 'Lob', value: 12, color: '#00ff88' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: '600' }}>{item.value}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0, 255, 136, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: item.color, width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Win Rate by Shot Type
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Volley', winRate: 82 },
                    { label: 'Drive', winRate: 76 },
                    { label: 'Dink', winRate: 68 },
                    { label: 'Lob', winRate: 55 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{item.label}</span>
                        <span style={{ color: '#00ff88', fontWeight: '600' }}>{item.winRate}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0, 255, 136, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #00ff88, #00d4ff)', width: `${item.winRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'technique' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Technique Scores
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Footwork', score: 72 },
                    { label: 'Positioning', score: 75 },
                    { label: 'Consistency', score: 78 },
                    { label: 'Court Coverage', score: 81 },
                    { label: 'Reaction Time', score: 68 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{item.label}</span>
                        <span style={{ color: '#00ff88', fontWeight: '600' }}>{item.score}/100</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0, 255, 136, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #00ff88, #00d4ff)', width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Performance Over Time
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px' }}>
                  {[35, 42, 48, 55, 62, 68, 75, 82, 85, 88, 90, 92].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(180deg, #00ff88, #00d4ff)', borderRadius: '4px 4px 0 0' }} />
                  ))}
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
                  Last 12 matches
                </div>
              </Card>
              <Card variant="default" shadow="md" padding="lg">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Improvement Areas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Lob Defense', trend: '+12%', color: '#22c55e' },
                    { label: 'Serve Accuracy', trend: '+8%', color: '#22c55e' },
                    { label: 'Net Play', trend: '+15%', color: '#22c55e' },
                    { label: 'Return Speed', trend: '-3%', color: '#ef4444' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: '600' }}>{item.trend}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
