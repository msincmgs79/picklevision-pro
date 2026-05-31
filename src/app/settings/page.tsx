'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PageLayout from '@/components/PageLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface SettingsState {
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  matchReminders: boolean;
  leaderboardUpdates: boolean;

  // Privacy
  publicProfile: boolean;
  showStats: boolean;
  allowComments: boolean;

  // Display
  darkMode: boolean;
  compactView: boolean;
  autoPlayVideos: boolean;

  // Account
  twoFactorAuth: boolean;
  activityLogging: boolean;

  // Theme
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
}

export default function SettingsRedesigned() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('settings');
  const [pageLoading, setPageLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    emailNotifications: true,
    pushNotifications: true,
    matchReminders: true,
    leaderboardUpdates: false,
    publicProfile: true,
    showStats: true,
    allowComments: true,
    darkMode: true,
    compactView: false,
    autoPlayVideos: true,
    twoFactorAuth: false,
    activityLogging: true,
    theme: 'dark',
    fontSize: 'medium',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else {
      setPageLoading(false);
    }
  }, [user, loading, router]);

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
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleToggle = (key: keyof SettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    setUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleSelectChange = (key: keyof SettingsState, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    // Simulate saving
    setTimeout(() => {
      setSaveSuccess(true);
      setUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      matchReminders: true,
      leaderboardUpdates: false,
      publicProfile: true,
      showStats: true,
      allowComments: true,
      darkMode: true,
      compactView: false,
      autoPlayVideos: true,
      twoFactorAuth: false,
      activityLogging: true,
      theme: 'dark',
      fontSize: 'medium',
    });
    setUnsavedChanges(false);
    setSaveSuccess(false);
  };

  const ToggleSetting = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
  }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
        marginBottom: '16px',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
          {description}
        </div>
      </div>
      <input
        type="checkbox"
        checked={value}
        onChange={onChange}
        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
      />
    </div>
  );

  const SelectSetting = ({
    label,
    description,
    value,
    options,
    onChange,
  }: {
    label: string;
    description: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
  }) => (
    <div
      style={{
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
        {description}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '6px',
          color: 'white',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading settings...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div>
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: 'white',
              }}
            >
              Settings
            </h1>
            <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Manage your preferences and account settings
            </p>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div
              style={{
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#00ff88',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ✓ Settings saved successfully
            </div>
          )}

          {/* Notifications Section */}
          <Card variant="default" shadow="md" padding="lg">
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#00ff88',
              }}
            >
              🔔 Notifications
            </h2>
            <ToggleSetting
              label="Email Notifications"
              description="Receive email updates about your account"
              value={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
            />
            <ToggleSetting
              label="Push Notifications"
              description="Send push notifications to your device"
              value={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
            />
            <ToggleSetting
              label="Match Reminders"
              description="Get reminded about upcoming matches"
              value={settings.matchReminders}
              onChange={() => handleToggle('matchReminders')}
            />
            <ToggleSetting
              label="Leaderboard Updates"
              description="Notify me of ranking changes"
              value={settings.leaderboardUpdates}
              onChange={() => handleToggle('leaderboardUpdates')}
            />
          </Card>

          {/* Privacy Section */}
          <Card variant="default" shadow="md" padding="lg">
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#00ff88',
              }}
            >
              🔒 Privacy
            </h2>
            <ToggleSetting
              label="Public Profile"
              description="Make your profile visible to other players"
              value={settings.publicProfile}
              onChange={() => handleToggle('publicProfile')}
            />
            <ToggleSetting
              label="Show Statistics"
              description="Display your stats on leaderboards"
              value={settings.showStats}
              onChange={() => handleToggle('showStats')}
            />
            <ToggleSetting
              label="Allow Comments"
              description="Let others comment on your videos"
              value={settings.allowComments}
              onChange={() => handleToggle('allowComments')}
            />
          </Card>

          {/* Display Section */}
          <Card variant="default" shadow="md" padding="lg">
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#00ff88',
              }}
            >
              🎨 Display
            </h2>
            <SelectSetting
              label="Theme"
              description="Choose your preferred color theme"
              value={settings.theme}
              options={[
                { label: 'Dark Mode', value: 'dark' },
                { label: 'Light Mode', value: 'light' },
              ]}
              onChange={(value) => handleSelectChange('theme', value)}
            />
            <SelectSetting
              label="Font Size"
              description="Adjust text size for better readability"
              value={settings.fontSize}
              options={[
                { label: 'Small', value: 'small' },
                { label: 'Medium (Default)', value: 'medium' },
                { label: 'Large', value: 'large' },
              ]}
              onChange={(value) => handleSelectChange('fontSize', value)}
            />
            <ToggleSetting
              label="Compact View"
              description="Display more content in compact layout"
              value={settings.compactView}
              onChange={() => handleToggle('compactView')}
            />
            <ToggleSetting
              label="Auto-Play Videos"
              description="Automatically play videos when viewing"
              value={settings.autoPlayVideos}
              onChange={() => handleToggle('autoPlayVideos')}
            />
          </Card>

          {/* Security Section */}
          <Card variant="default" shadow="md" padding="lg">
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#00ff88',
              }}
            >
              🔐 Security
            </h2>
            <ToggleSetting
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              value={settings.twoFactorAuth}
              onChange={() => handleToggle('twoFactorAuth')}
            />
            <ToggleSetting
              label="Activity Logging"
              description="Keep a record of account access and changes"
              value={settings.activityLogging}
              onChange={() => handleToggle('activityLogging')}
            />
            <div style={{ paddingTop: '8px' }}>
              <Button variant="secondary" size="md" fullWidth>
                🔑 Change Password
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card variant="default" shadow="md" padding="lg">
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#ff6b6b',
              }}
            >
              ⚠️ Danger Zone
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button variant="secondary" size="md" fullWidth>
                📥 Download My Data
              </Button>
              <Button variant="secondary" size="md" fullWidth>
                🗑️ Delete Account
              </Button>
            </div>
          </Card>

          {/* Action Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginTop: '8px',
            }}
          >
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!unsavedChanges}
              onClick={handleSave}
            >
              💾 Save Changes
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={!unsavedChanges}
              onClick={handleReset}
            >
              ↺ Reset
            </Button>
          </div>

          {/* Status Indicator */}
          {unsavedChanges && (
            <div
              style={{
                fontSize: '12px',
                color: '#f59e0b',
                textAlign: 'center',
              }}
            >
              ⚠️ You have unsaved changes
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
