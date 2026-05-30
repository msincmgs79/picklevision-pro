'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getUserProfile, getTopPlayers } from '@/lib/db';
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

interface Player {
  id: string;
  rank: number;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  region: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export default function LeaderboardRedesigned() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('leaderboard');
  const [activeTab, setActiveTab] = useState('overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating');

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
  ];

  const tabItems = [
    { id: 'overall', label: 'Overall', icon: undefined },
    { id: 'regional', label: 'Regional', icon: undefined },
    { id: 'skill', label: 'By Skill Level', icon: undefined },
    { id: 'monthly', label: 'Monthly', icon: undefined },
  ];

  // Sample leaderboard data
  const allPlayers: Player[] = [
    {
      id: '1',
      rank: 1,
      name: 'Alex Chen',
      rating: 4.85,
      wins: 156,
      losses: 24,
      winRate: 87,
      region: 'California',
      skillLevel: 'pro',
      trend: 'up',
      trendValue: 0.12,
    },
    {
      id: '2',
      rank: 2,
      name: 'Maria Rodriguez',
      rating: 4.72,
      wins: 142,
      losses: 31,
      winRate: 82,
      region: 'Florida',
      skillLevel: 'pro',
      trend: 'up',
      trendValue: 0.08,
    },
    {
      id: '3',
      rank: 3,
      name: 'James Wilson',
      rating: 4.61,
      wins: 128,
      losses: 35,
      winRate: 79,
      region: 'New York',
      skillLevel: 'advanced',
      trend: 'down',
      trendValue: -0.05,
    },
    {
      id: '4',
      rank: 4,
      name: 'Sarah Smith',
      rating: 4.52,
      wins: 115,
      losses: 42,
      winRate: 73,
      region: 'Texas',
      skillLevel: 'advanced',
      trend: 'stable',
      trendValue: 0.0,
    },
    {
      id: '5',
      rank: 5,
      name: 'John Doe',
      rating: 4.38,
      wins: 98,
      losses: 52,
      winRate: 65,
      region: 'California',
      skillLevel: 'intermediate',
      trend: 'up',
      trendValue: 0.15,
    },
    {
      id: '6',
      rank: 6,
      name: 'Emma Thompson',
      rating: 4.25,
      wins: 87,
      losses: 61,
      winRate: 59,
      region: 'Washington',
      skillLevel: 'intermediate',
      trend: 'up',
      trendValue: 0.22,
    },
    {
      id: '7',
      rank: 7,
      name: 'David Park',
      rating: 4.12,
      wins: 76,
      losses: 68,
      winRate: 53,
      region: 'Nevada',
      skillLevel: 'intermediate',
      trend: 'down',
      trendValue: -0.08,
    },
    {
      id: '8',
      rank: 8,
      name: 'Lisa Anderson',
      rating: 3.98,
      wins: 64,
      losses: 78,
      winRate: 45,
      region: 'Arizona',
      skillLevel: 'intermediate',
      trend: 'up',
      trendValue: 0.18,
    },
  ];

  const filteredPlayers = allPlayers
    .filter((player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((player) => {
      if (activeTab === 'regional') {
        return player.region === 'California' || player.region === 'Florida';
      }
      if (activeTab === 'skill') {
        return player.skillLevel === 'advanced' || player.skillLevel === 'pro';
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'wins') return b.wins - a.wins;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      return a.rank - b.rank;
    });

  const topPlayer = allPlayers[0];
  const userRank = allPlayers.find((p) => p.name === userProfile?.displayName);

  const getTrendBadgeVariant = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'danger';
      case 'stable':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const getSkillBadgeVariant = (level: string) => {
    switch (level) {
      case 'pro':
        return 'primary';
      case 'advanced':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'beginner':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={setSearchQuery}
          notificationCount={1}
          onNotificationClick={() => console.log('Notifications')}
          onProfileClick={() => router.push('/profile')}
          searchPlaceholder="Search players..."
        />
      }
      sidebar={
        <Navigation
          items={navItems}
          activeItemId={activeNav}
          onItemClick={setActiveNav}
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading leaderboard...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div>
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: '28px',
                fontWeight: '600',
                color: 'white',
              }}
            >
              Leaderboard
            </h1>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Top players and rankings across all regions
            </p>
          </div>

          {/* Top Player Spotlight */}
          <Card variant="highlighted" shadow="md" padding="lg" hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0a0e27',
                }}
              >
                🥇
              </div>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                  Top Player
                </div>
                <h2
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#00ff88',
                  }}
                >
                  {topPlayer.name}
                </h2>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Rating:</span>
                    <span style={{ color: '#00ff88', fontWeight: '600', marginLeft: '4px' }}>
                      {topPlayer.rating.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate:</span>
                    <span style={{ color: '#00d4ff', fontWeight: '600', marginLeft: '4px' }}>
                      {topPlayer.winRate}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Wins:</span>
                    <span style={{ color: 'white', fontWeight: '600', marginLeft: '4px' }}>
                      {topPlayer.wins}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs and Filters */}
          <div>
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="default"
              size="md"
            />
          </div>

          {/* Sort Controls */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setSortBy('rating')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'rating' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'rating' ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 255, 136, 0.1)'}`,
                color: sortBy === 'rating' ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              Rating
            </button>
            <button
              onClick={() => setSortBy('wins')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'wins' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'wins' ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 255, 136, 0.1)'}`,
                color: sortBy === 'wins' ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              Most Wins
            </button>
            <button
              onClick={() => setSortBy('winRate')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'winRate' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'winRate' ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 255, 136, 0.1)'}`,
                color: sortBy === 'winRate' ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              Win Rate
            </button>
          </div>

          {/* Leaderboard List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 255, 136, 0.1)',
                  borderRadius: '6px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.08)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 255, 136, 0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.05)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 255, 136, 0.1)';
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '16px',
                    color: '#00ff88',
                  }}
                >
                  #{player.rank}
                </div>

                {/* Player Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 212, 255, 0.2))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {player.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                        {player.name}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                        {player.region}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>Rating</div>
                    <div style={{ color: '#00ff88', fontWeight: '700', fontSize: '14px' }}>
                      {player.rating.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>Wins</div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>
                      {player.wins}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>Win Rate</div>
                    <div style={{ color: '#00d4ff', fontWeight: '700', fontSize: '14px' }}>
                      {player.winRate}%
                    </div>
                  </div>
                  <Badge variant={getTrendBadgeVariant(player.trend)} size="sm">
                    {player.trend === 'up'
                      ? `↑ +${player.trendValue}`
                      : player.trend === 'down'
                        ? `↓ ${player.trendValue}`
                        : '→ Stable'}
                  </Badge>
                  <Badge variant={getSkillBadgeVariant(player.skillLevel)} size="sm">
                    {player.skillLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredPlayers.length === 0 && (
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                  No players found
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                  Try adjusting your search or filters
                </p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            <Button variant="primary" size="md" fullWidth>
              🎯 View My Stats
            </Button>
            <Button variant="secondary" size="md" fullWidth>
              📊 Compare Players
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
