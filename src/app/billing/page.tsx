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
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Tabs from '@/components/Tabs';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface BillingInvoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export default function BillingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('billing');
  const [activeTab, setActiveTab] = useState('plans');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const mockInvoices: BillingInvoice[] = [
    {
      id: 'INV-001',
      date: 'May 31, 2026',
      amount: '$19.99',
      status: 'paid',
      description: 'PickleVision Pro - Monthly Subscription',
    },
    {
      id: 'INV-002',
      date: 'April 30, 2026',
      amount: '$19.99',
      status: 'paid',
      description: 'PickleVision Pro - Monthly Subscription',
    },
  ];

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
        // Check if user has active subscription (mock for now)
        setIsSubscribed(false);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setPageLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleCheckout = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowCheckout(false);
    setIsSubscribed(true);
    setCardNumber('');
    setExpiryDate('');
    setCvc('');
    alert('Subscription activated! Welcome to PickleVision Pro.');
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      setIsSubscribed(false);
      alert('Subscription cancelled. You will have access until the end of your billing cycle.');
    }
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
    { id: 'billing', label: 'Unlock Features', icon: '🔓' },
  ];

  const tabItems = [
    { id: 'plans', label: 'Plans', icon: undefined },
    { id: 'subscription', label: 'My Subscription', icon: undefined },
    { id: 'history', label: 'Billing History', icon: undefined },
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading billing information...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: 'white' }}>
              Billing & Subscription
            </h1>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Manage your subscription and billing information
            </p>
          </div>

          <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} variant="default" size="md" />

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="default" shadow="md" padding="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Free Plan */}
                  <div
                    style={{
                      border: '1px solid rgba(0, 255, 136, 0.1)',
                      borderRadius: '8px',
                      padding: '24px',
                      background: 'rgba(0, 255, 136, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: 'white' }}>
                          Free Plan
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                          Get started with basic features
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        Current Plan
                      </Badge>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88', marginBottom: '16px' }}>
                      Free
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '20px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        lineHeight: '1.8',
                      }}
                    >
                      <li>1 match per month</li>
                      <li>Basic analytics</li>
                      <li>Limited video storage</li>
                      <li>Community access</li>
                    </ul>
                  </div>

                  {/* Pro Plan */}
                  <div
                    style={{
                      border: '2px solid rgba(0, 255, 136, 0.3)',
                      borderRadius: '8px',
                      padding: '24px',
                      background: 'rgba(0, 255, 136, 0.05)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '24px',
                        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                        color: '#0a0e27',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      RECOMMENDED
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#00ff88' }}>
                          Pro Plan
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                          Unlock unlimited power
                        </p>
                      </div>
                      {isSubscribed && (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '700', color: '#00ff88' }}>$19.99</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '8px' }}>/month</span>
                    </div>
                    <ul
                      style={{
                        margin: '16px 0',
                        paddingLeft: '20px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        lineHeight: '1.8',
                      }}
                    >
                      <li>✓ Unlimited matches</li>
                      <li>✓ Advanced AI analytics</li>
                      <li>✓ Unlimited video storage</li>
                      <li>✓ Player tracking & stats</li>
                      <li>✓ Priority support</li>
                      <li>✓ Premium leaderboard access</li>
                    </ul>
                    {!isSubscribed ? (
                      <Button variant="primary" size="md" fullWidth onClick={() => setShowCheckout(true)}>
                        Upgrade to Pro - $19.99/month
                      </Button>
                    ) : (
                      <Button variant="secondary" size="md" fullWidth disabled>
                        Currently Active
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <Card variant="default" shadow="md" padding="lg">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isSubscribed ? (
                  <>
                    <div>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                        Active Subscription
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Plan</span>
                          <span style={{ color: '#00ff88', fontWeight: '600' }}>PickleVision Pro</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Billing Cycle</span>
                          <span style={{ color: '#00d4ff', fontWeight: '600' }}>Monthly</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Next Billing Date</span>
                          <span style={{ color: 'white', fontWeight: '600' }}>June 30, 2026</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Amount</span>
                          <span style={{ color: '#00ff88', fontWeight: '600' }}>$19.99/month</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="danger" size="md" fullWidth onClick={handleCancelSubscription}>
                      Cancel Subscription
                    </Button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                    <p style={{ margin: '0 0 24px 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                      No active subscription
                    </p>
                    <Button variant="primary" size="md" onClick={() => setActiveTab('plans')}>
                      View Plans
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Billing History Tab */}
          {activeTab === 'history' && (
            <Card variant="default" shadow="md" padding="lg">
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                  Billing History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mockInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(0, 255, 136, 0.05)',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 255, 136, 0.1)',
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: 'white', fontWeight: '600', fontSize: '14px' }}>
                          {invoice.description}
                        </p>
                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                          {invoice.date}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#00ff88', fontWeight: '600' }}>{invoice.amount}</span>
                        <Badge
                          variant={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Checkout Modal */}
          {showCheckout && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => !isProcessing && setShowCheckout(false)}
            >
              <Card
                variant="default"
                shadow="md"
                padding="lg"
                style={{
                  maxWidth: '400px',
                  width: '90%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: 'white' }}>
                  Upgrade to Pro
                </h2>
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>PickleVision Pro - Monthly</span>
                    <span style={{ color: '#00ff88', fontWeight: '600' }}>$19.99</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                    Billed monthly. Cancel anytime.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 136, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' }}>
                        Expiry
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.2)',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' }}>
                        CVC
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.2)',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => setShowCheckout(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={handleCheckout}
                    disabled={isProcessing || !cardNumber || !expiryDate || !cvc}
                  >
                    {isProcessing ? 'Processing...' : 'Pay $19.99'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
