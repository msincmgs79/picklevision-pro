'use client';

import React from 'react';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  logoText?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  sticky?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      logoText = 'PickleVision Pro',
      onSearchChange,
      searchPlaceholder = 'Search...',
      sticky = true,
      notificationCount = 0,
      onNotificationClick,
      onProfileClick,
      className,
      ...props
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearchChange?.(query);
    };

    // Base styles - using React.CSSProperties (CORRECT)
    const headerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      padding: '12px 20px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
      height: '60px',
      ...(sticky && { position: 'sticky', top: 0, zIndex: 40 }),
    };

    return (
      <header ref={ref} style={headerStyles} className={className} {...props}>
        {/* Logo Section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '200px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
              borderRadius: '6px',
              fontWeight: '700',
              color: '#000',
              fontSize: '18px',
            }}
          >
            PV
          </div>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              whiteSpace: 'nowrap',
            }}
          >
            {logoText}
          </span>
        </div>

        {/* Search Section */}
        {onSearchChange && (
          <div
            style={{
              flex: 1,
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 150ms ease-in-out',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 255, 136, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        )}

        {/* Right Section - Notifications and Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            minWidth: '120px',
            justifyContent: 'flex-end',
          }}
        >
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.6)',
              transition: 'color 150ms ease-in-out',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.6)';
            }}
            aria-label="Notifications"
          >
            🔔
            {notificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                  color: '#000',
                  borderRadius: '9999px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'rgba(0, 255, 136, 0.15)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '50%',
              color: '#00ff88',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 150ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
            }}
            aria-label="User profile"
          >
            👤
          </button>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';

export default Header;
