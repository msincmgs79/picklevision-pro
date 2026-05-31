'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile, getUserMatches, getTopPlayers } from '@/lib/db';
import type { User, Match } from '@/lib/db';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: number;
}

export default function HomeRedesigned() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [recentMatches, setRecentMatches] = useState<(Match & { id: string })[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
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

        const matches = await getUserMatches(user.uid, 5);
        setRecentMatches(matches);
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
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Navigation items
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      badge: undefined,
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: '🎥',
      badge: undefined,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📈',
      badge: 3,
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: '🏆',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
    },
  ];

  // Tab items
  const tabItems = [
    { id: 'overview', label: 'Overview', icon: undefined },
    { id: 'matches', label: 'Recent Matches', icon: undefined },
    { id: 'stats', label: 'Statistics', icon: undefined },
  ];

  const winRate = userProfile
    ? Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100) || 0
    : 0;

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={(query) => console.log('Search:', query)}
          notificationCount={3}
          onNotificationClick={() => console.log('Notifications clicked')}
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading dashboard...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Stats */}
          <div>
            <h1
              style={{
                margin: '0 0 16px 0',
                fontSize: '28px',
                fontWeight: '600',
                color: 'white',
              }}
            >
              Welcome back, {userProfile?.displayName || 'Player'}! 👋
            </h1>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Rating Card */}
            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Pro Rating
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#00ff88',
                    marginBottom: '4px',
                  }}
                >
                  {userProfile?.proRating?.toFixed(2) || '2.00'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Based on {userProfile?.wins || 0} wins
                </div>
              </div>
            </Card>

            {/* Wins Card */}
            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Wins
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#00ff88',
                    marginBottom: '4px',
                  }}
                >
                  {userProfile?.wins || 0}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Total matches played
                </div>
              </div>
            </Card>

            {/* Win Rate Card */}
            <Card variant="highlighted" shadow="md" padding="lg" hoverable>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Win Rate
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#00ff88',
                    marginBottom: '4px',
                  }}
                >
                  {winRate}%
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {userProfile?.wins || 0}W / {userProfile?.losses || 0}L
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs Section */}
          <div>
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="default"
              size="md"
            />
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <Card variant="default" shadow="md" padding="lg">
                <div>
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    Recent Performance
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#00ff88',
                        }}
                      >
                        {userProfile?.wins || 0}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginTop: '4px',
                        }}
                      >
                        Wins
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#00d4ff',
                        }}
                      >
                        {(userProfile?.wins || 0) + (userProfile?.losses || 0)}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginTop: '4px',
                        }}
                      >
                        Total
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#ff6b6b',
                        }}
                      >
                        {userProfile?.losses || 0}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginTop: '4px',
                        }}
                      >
                        Losses
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'matches' && (
              <Card variant="default" shadow="md" padding="lg">
                <div>
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    Recent Matches
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentMatches.length > 0 ? (
                      recentMatches.map((match) => (
                        <div
                          key={match.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'rgba(0, 255, 136, 0.05)',
                            border: '1px solid rgba(0, 255, 136, 0.1)',
                            borderRadius: '6px',
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: '0 0 4px 0',
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '14px',
                              }}
                            >
                              vs {match.opponent}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '12px',
                              }}
                            >
                              {match.date?.toDate?.()?.toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span
                              style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '14px',
                              }}
                            >
                              {match.yourScore}-{match.opponentScore}
                            </span>
                            <Badge
                              variant={match.result === 'WIN' ? 'success' : 'danger'}
                              size="sm"
                            >
                              {match.result}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                        No matches recorded yet
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'stats' && (
              <Card variant="default" shadow="md" padding="lg">
                <div>
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    Statistics
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Pro Rating</span>
                        <span
                          style={{
                            color: '#00ff88',
                            fontWeight: '600',
                          }}
                        >
                          {userProfile?.proRating?.toFixed(2)}
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
                            width: `${((userProfile?.proRating || 2) - 1) / 3 * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Win Rate</span>
                        <span
                          style={{
                            color: '#00ff88',
                            fontWeight: '600',
                          }}
                        >
                          {winRate}%
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
                            width: `${winRate}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            <Button variant="primary" size="md" fullWidth onClick={() => router.push('/videos')}>
              🎥 Record Match
            </Button>
            <Button variant="secondary" size="md" fullWidth onClick={() => router.push('/analytics')}>
              📊 Analytics
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
