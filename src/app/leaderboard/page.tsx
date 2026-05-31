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
  skillLevel: string;
  trend: string;
  trendValue: number;
}

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('leaderboard');
  const [activeTab, setActiveTab] = useState('overall');
  const [searchQuery, setSearchQuery] = useState('');

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
        const topPlayers = await getTopPlayers();
        const formatted: Player[] = (topPlayers || []).map((u: any, idx: number) => ({
          id: u.uid || `player-${idx}`,
          rank: idx + 1,
          name: u.displayName || 'Unknown',
          rating: u.rating || 0,
          wins: u.wins || 0,
          losses: u.losses || 0,
          winRate: u.wins && u.losses ? Math.round((u.wins / (u.wins + u.losses)) * 100) : 0,
          region: 'USA',
          skillLevel: u.wins > 50 ? 'pro' : u.wins > 20 ? 'advanced' : 'intermediate',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          trendValue: Math.random() * 0.15,
        }));
        setPlayers(formatted);
      } catch (error) {
        console.error('Error:', error);
        setPlayers([]);
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
  ];

  const tabItems = [
    { id: 'overall', label: 'Overall', icon: undefined },
    { id: 'regional', label: 'Regional', icon: undefined },
    { id: 'skill', label: 'By Skill Level', icon: undefined },
    { id: 'monthly', label: 'Monthly', icon: undefined },
  ];

  const getTrendVariant = (trend: string) => (trend === 'up' ? 'success' : 'danger');
  const getSkillVariant = (level: string) => (level === 'pro' ? 'primary' : level === 'advanced' ? 'success' : level === 'intermediate' ? 'warning' : 'secondary');

  const filtered = players.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <PageLayout
      header={<Header logoText="PickleVision Pro" onSearchChange={setSearchQuery} notificationCount={1} onNotificationClick={() => {}} onProfileClick={() => router.push('/profile')} searchPlaceholder="Search players..." />}
      sidebar={<Navigation items={navItems} activeItemId={activeNav} onItemClick={(id) => { setActiveNav(id); if (id === 'dashboard') router.push('/'); else if (id === 'videos') router.push('/videos'); else if (id === 'analytics') router.push('/analytics'); else if (id === 'leaderboard') router.push('/leaderboard'); else if (id === 'profile') router.push('/profile'); }} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}><span>© 2026 PickleVision Pro</span><div style={{ display: 'flex', gap: '16px' }}><a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Privacy</a><a href="#" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Terms</a></div></div>}
    >
      {pageLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading leaderboard...</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div><h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>Leaderboard</h1><p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Top ranked players</p></div>
          <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} variant="default" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.slice(0, 10).map((player) => (
              <Card key={player.id} variant="interactive" shadow="sm" padding="md">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#0a0e27' }}>{player.rank}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{player.name}</div><div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Rating: {player.rating.toFixed(2)} | {player.wins}W-{player.losses}L | WR: {player.winRate}%</div></div>
                  <div style={{ display: 'flex', gap: '8px' }}><Badge variant={getSkillVariant(player.skillLevel)} size="sm">{player.skillLevel.toUpperCase()}</Badge><Badge variant={getTrendVariant(player.trend)} size="sm">{player.trend === 'up' ? '↑' : '↓'} {Math.abs(player.trendValue * 100).toFixed(0)}%</Badge></div>
                </div>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && (<Card variant="default" shadow="md" padding="lg"><div style={{ textAlign: 'center', padding: '48px 0' }}><p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>No players found</p></div></Card>)}
        </div>
      )}
    </PageLayout>
  );
}