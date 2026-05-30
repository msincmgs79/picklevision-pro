'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';

export default function AuthRedesigned() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user && !loading) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        // Login logic
        console.log('Login:', { email, password, rememberMe });
      } else {
        // Sign up logic
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        console.log('Sign up:', { email, password, displayName });
      }
      // Simulated delay
      setTimeout(() => {
        setIsLoading(false);
        router.push('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Logo Section */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          {/* Logo Icon - Paddle with Glasses */}
          <div
            style={{
              display: 'inline-block',
              marginBottom: '24px',
            }}
          >
            <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '60px', height: '60px' }}>
              <defs>
                <linearGradient id="authPaddleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#00ff88', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="authGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
                </filter>
              </defs>
              <rect width="80" height="80" fill="linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)" />
              <circle cx="40" cy="40" r="38" fill="none" stroke="url(#authPaddleGradient)" strokeWidth="1" opacity="0.3" filter="url(#authGlow)" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="url(#authPaddleGradient)" strokeWidth="2" />
              <g transform="translate(40, 40)">
                <rect x="-5" y="6" width="10" height="18" rx="5" fill="url(#authPaddleGradient)" opacity="0.9" />
                <line x1="-3" y1="10" x2="3" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" opacity="0.6" />
                <line x1="-3" y1="14" x2="3" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" opacity="0.6" />
                <line x1="-3" y1="18" x2="3" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" opacity="0.6" />
                <line x1="-3" y1="22" x2="3" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" opacity="0.6" />
                <ellipse cx="0" cy="-14" rx="16" ry="18" fill="url(#authPaddleGradient)" />
                <ellipse cx="0" cy="-14" rx="14" ry="16" fill="url(#authPaddleGradient)" opacity="0.3" />
                <ellipse cx="0" cy="-14" rx="16" ry="18" fill="none" stroke="url(#authPaddleGradient)" strokeWidth="1.5" opacity="0.5" />
                <ellipse cx="-7.5" cy="-19" rx="6" ry="7" fill="#f59e0b" opacity="0.85" filter="url(#authGlow)" />
                <ellipse cx="-7.5" cy="-19" rx="6" ry="7" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.9" />
                <ellipse cx="7.5" cy="-19" rx="6" ry="7" fill="#f59e0b" opacity="0.85" filter="url(#authGlow)" />
                <ellipse cx="7.5" cy="-19" rx="6" ry="7" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.9" />
                <line x1="-1.5" y1="-19" x2="1.5" y2="-19" stroke="#f59e0b" strokeWidth="1.3" opacity="0.9" />
                <ellipse cx="-3" cy="-16" rx="4" ry="5" fill="rgba(255,255,255,0.5)" />
              </g>
            </svg>
          </div>

          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: 'white',
            }}
          >
            PickleVision Pro
          </h1>
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Pickleball Video Analysis Platform
          </p>
        </div>

        {/* Auth Card */}
        <Card variant="highlighted" shadow="md" padding="lg">
          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '0',
              borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
              marginBottom: '24px',
            }}
          >
            <button
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                color: authMode === 'login' ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: authMode === 'login' ? '2px solid #00ff88' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                color: authMode === 'signup' ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: authMode === 'signup' ? '2px solid #00ff88' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#ff6b6b',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Sign Up Only: Display Name */}
            {authMode === 'signup' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    marginBottom: '6px',
                    fontWeight: '500',
                  }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
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
            )}

            {/* Email */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  marginBottom: '6px',
                  fontWeight: '500',
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
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

            {/* Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  marginBottom: '6px',
                  fontWeight: '500',
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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

            {/* Sign Up Only: Confirm Password */}
            {authMode === 'signup' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    marginBottom: '6px',
                    fontWeight: '500',
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required={authMode === 'signup'}
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
            )}

            {/* Login Only: Remember Me */}
            {authMode === 'login' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="rememberMe"
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                  }}
                >
                  Remember me
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 16px',
                background: isLoading ? 'rgba(0, 255, 136, 0.5)' : 'linear-gradient(135deg, #00ff88, #00d4ff)',
                color: '#0a0e27',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(10, 14, 39, 0.3)',
                    borderTop: '2px solid #0a0e27',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {authMode === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : authMode === 'login' ? (
                '🔓 Login'
              ) : (
                '✨ Create Account'
              )}
            </button>
          </form>

          {/* Forgot Password Link */}
          {authMode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a
                href="#"
                style={{
                  fontSize: '13px',
                  color: '#00ff88',
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
              >
                Forgot password?
              </a>
            </div>
          )}

          {/* Terms & Privacy */}
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center',
              marginTop: '20px',
              lineHeight: '1.6',
            }}
          >
            By {authMode === 'login' ? 'logging in' : 'signing up'}, you agree to our{' '}
            <a
              href="#"
              style={{
                color: '#00ff88',
                textDecoration: 'none',
              }}
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="#"
              style={{
                color: '#00ff88',
                textDecoration: 'none',
              }}
            >
              Privacy Policy
            </a>
          </p>
        </Card>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '32px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <p style={{ margin: '0' }}>© 2026 PickleVision Pro. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
