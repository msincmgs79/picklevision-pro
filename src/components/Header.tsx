'use client';

import React from 'react';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  logoText?: string;
  onSearchChange?: (query: string) => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  searchPlaceholder?: string;
  sticky?: boolean;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      logoText = 'PickleVision Pro',
      onSearchChange,
      notificationCount = 0,
      onNotificationClick,
      onProfileClick,
      searchPlaceholder = 'Search...',
      sticky = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = React.useState('');

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      background: 'rgba(10, 14, 39, 0.8)',
      borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
      backdropFilter: 'blur(10px)',
      ...(sticky && {
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }),
      ...style,
    };

    const logoStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '18px',
      fontWeight: '700',
      background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      minWidth: 'auto',
      cursor: 'pointer',
    };

    const searchContainerStyle: React.CSSProperties = {
      flex: 1,
      maxWidth: '400px',
      marginLeft: '24px',
      marginRight: '24px',
    };

    const searchInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 150ms ease-in-out',
    };

    const actionContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    };

    const notificationButtonStyle: React.CSSProperties = {
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '20px',
      cursor: 'pointer',
      position: 'relative',
      padding: '0',
      transition: 'color 150ms ease-in-out',
    };

    const notificationBadgeStyle: React.CSSProperties = {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      background: 'linear-gradient(135deg, #ef4444, #f87171)',
      color: 'white',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '700',
    };

    const profileButtonStyle: React.CSSProperties = {
      background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
      border: 'none',
      color: '#0a0e27',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontWeight: '700',
      fontSize: '14px',
      transition: 'all 150ms ease-in-out',
    };

    return (
      <div ref={ref} style={headerStyle} className={className} {...props}>
        {/* Logo */}
        <div style={logoStyle}>
          <div style={{ fontSize: '24px' }}>PV</div>
          <span>{logoText}</span>
        </div>

        {/* Search */}
        <div style={searchContainerStyle}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            style={searchInputStyle}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'rgba(0, 255, 136, 0.4)';
              (e.target as HTMLInputElement).style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'rgba(0, 255, 136, 0.2)';
              (e.target as HTMLInputElement).style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          />
        </div>

        {/* Actions */}
        <div style={actionContainerStyle}>
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            style={notificationButtonStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = '#00ff88';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            🔔
            {notificationCount > 0 && (
              <div style={notificationBadgeStyle}>{notificationCount}</div>
            )}
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            style={profileButtonStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            👤
          </button>
        </div>
      </div>
    );
  }
);

Header.displayName = 'Header';

export default Header;
