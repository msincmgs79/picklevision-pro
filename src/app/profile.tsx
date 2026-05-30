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

export default function ProfileRedesigned() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('profile');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
  });

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
        if (profile) {
          setEditData({
            displayName: profile.displayName || '',
            bio: 'Passionate pickleball player and video analyst',
            location: 'California',
            website: 'picklevisionpro.com',
          });
        }
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
          onSearchChange={(query) => console.log('Search:', query)}
          notificationCount={0}
          onNotificationClick={() => console.log('Notifications')}
          onProfileClick={() => console.log('Profile')}
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading profile...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Header */}
          <Card variant="highlighted" shadow="md" padding="lg" hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
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
                <h1
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#00ff88',
                  }}
                >
                  {userProfile?.displayName || 'Player'}
                </h1>
                <p style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Passionate pickleball player and video analyst
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Rating:</span>
                    <span style={{ color: '#00ff88', fontWeight: '600', marginLeft: '4px' }}>
                      {userProfile?.proRating?.toFixed(2) || '2.00'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Wins:</span>
                    <span style={{ color: '#00d4ff', fontWeight: '600', marginLeft: '4px' }}>
                      {userProfile?.wins || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate:</span>
                    <span style={{ color: '#f59e0b', fontWeight: '600', marginLeft: '4px' }}>
                      {winRate}%
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  ✏️ {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs
            items={tabItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="default"
            size="md"
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isEditing ? (
                <Card variant="default" shadow="md" padding="lg">
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    Edit Profile
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editData.displayName}
                        onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                        Bio
                      </label>
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          minHeight: '80px',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                        Location
                      </label>
                      <input
                        type="text"
                        value={editData.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                        Website
                      </label>
                      <input
                        type="text"
                        value={editData.website}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <Button variant="primary" size="md" fullWidth>
                        💾 Save Changes
                      </Button>
                      <Button variant="secondary" size="md" fullWidth onClick={() => setIsEditing(false)}>
                        ❌ Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card variant="default" shadow="md" padding="lg">
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    About
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Location:</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', marginLeft: '8px' }}>California</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Website:</span>
                      <span style={{ color: '#00ff88', marginLeft: '8px' }}>picklevisionpro.com</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Member Since:</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', marginLeft: '8px' }}>January 2025</span>
                    </div>
                  </div>
                </Card>
              )}

              <Card variant="default" shadow="md" padding="lg">
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Recent Stats
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
                      <span style={{ color: '#00ff88', fontWeight: '600' }}>
                        {userProfile?.proRating?.toFixed(2) || '2.00'}
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
                      <span style={{ color: '#00ff88', fontWeight: '600' }}>{winRate}%</span>
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
              </Card>
            </div>
          )}

          {activeTab === 'stats' && (
            <Card variant="default" shadow="md" padding="lg">
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                Detailed Statistics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Total Wins
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>
                    {userProfile?.wins || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Total Losses
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff6b6b' }}>
                    {userProfile?.losses || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Win Rate Percentage
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#00d4ff' }}>
                    {winRate}%
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'achievements' && (
            <Card variant="default" shadow="md" padding="lg">
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                Achievements
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '12px',
                }}
              >
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    style={{
                      background: achievement.earned
                        ? 'rgba(0, 255, 136, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${achievement.earned ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      padding: '12px',
                      textAlign: 'center',
                      opacity: achievement.earned ? 1 : 0.5,
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                      {achievement.icon}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {achievement.name}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card variant="default" shadow="md" padding="lg">
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Email Notifications</span>
                  <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Public Profile</span>
                  <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Dark Mode</span>
                  <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                </div>
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
              🔐 Change Password
            </Button>
            <Button variant="secondary" size="md" fullWidth>
              🚪 Logout
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
