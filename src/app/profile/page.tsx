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
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';
import Button from '@/components/Button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('profile');
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
    { id: 'stats', label: 'Statistics', icon: undefined },
    { id: 'achievements', label: 'Achievements', icon: undefined },
    { id: 'settings', label: 'Settings', icon: undefined },
  ];

  const winRate = userProfile
    ? Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100) || 0
    : 0;

  const achievements = [
    { id: 1, name: 'First Match', icon: '🎯', earned: true },
    { id: 2, name: '10 Wins', icon: '🏆', earned: true },
    { id: 3, name: '50 Wins', icon: '👑', earned: true },
    { id: 4, name: '100% Win Rate', icon: '⭐', earned: false },
    { id: 5, name: 'Video Master', icon: '🎥', earned: true },
    { id: 6, name: 'Top 10 Player', icon: '🥇', earned: false },
  ];

  return (
    <PageLayout
      header={
        <Header
          logoText="PickleVision Pro"
          onSearchChange={() => {}}
          notificationCount={0}
          onNotificationClick={() => console.log('Notifications')}
          onProfileClick={() => console.log('Profile')}
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading profile...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card variant="highlighted" shadow="md" padding="lg" hoverable>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    minWidth: '80px',
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
                  {(userProfile?.displayName || 'User')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: 'white' }}>
                    {userProfile?.displayName || 'User Profile'}
                  </h2>
                  <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', wordBreak: 'break-all' }}>
                    {userProfile?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
              <Button variant="primary" size="md" style={{ width: '100%' }}>
                Edit Profile
              </Button>
            </div>
          </Card>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}
          >
            <Card variant="default" shadow="sm" padding="md">
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                Total Matches
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#00ff88' }}>
                {(userProfile?.wins || 0) + (userProfile?.losses || 0)}
              </div>
            </Card>

            <Card variant="default" shadow="sm" padding="md">
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                Win Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#00d4ff' }}>
                {winRate}%
              </div>
            </Card>

            <Card variant="default" shadow="sm" padding="md">
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                Total Wins
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#22c55e' }}>
                {userProfile?.wins || 0}
              </div>
            </Card>

            <Card variant="default" shadow="sm" padding="md">
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                Total Losses
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>
                {userProfile?.losses || 0}
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

          {activeTab === 'achievements' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
              }}
            >
              {achievements.map((achievement) => (
                <Card
                  key={achievement.id}
                  variant={achievement.earned ? 'highlighted' : 'default'}
                  shadow="sm"
                  padding="md"
                  hoverable
                  style={{
                    opacity: achievement.earned ? 1 : 0.5,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                    {achievement.icon}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: achievement.earned ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '4px',
                    }}
                  >
                    {achievement.name}
                  </div>
                  {!achievement.earned && (
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                      Locked
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {activeTab !== 'achievements' && (
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {activeTab === 'overview' && 'Profile overview'}
                  {activeTab === 'stats' && 'Detailed statistics'}
                  {activeTab === 'settings' && 'Account settings'}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </PageLayout>
  );
}
