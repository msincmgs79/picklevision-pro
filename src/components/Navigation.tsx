'use client';

import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface NavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[];
  activeItemId: string;
  onItemClick: (itemId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Navigation = React.forwardRef<HTMLDivElement, NavigationProps>(
  (
    {
      items,
      activeItemId,
      onItemClick,
      collapsed = false,
      onToggleCollapse,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const navStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      width: collapsed ? '80px' : '280px',
      background: 'rgba(10, 14, 39, 0.6)',
      borderRight: '1px solid rgba(0, 255, 136, 0.1)',
      padding: '16px 0',
      transition: 'width 300ms ease-in-out',
      overflowY: 'auto',
      ...style,
    };

    const toggleButtonStyle: React.CSSProperties = {
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.6)',
      cursor: 'pointer',
      padding: '16px',
      fontSize: '16px',
      transition: 'color 150ms ease-in-out',
      alignSelf: 'flex-end',
      marginRight: '8px',
      marginBottom: '16px',
    };

    const itemStyle = (isActive: boolean, isDisabled: boolean): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: '12px',
      padding: collapsed ? '16px 12px' : '12px 20px',
      margin: '0 12px',
      borderRadius: '8px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      color: isActive ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
      background: isActive ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
      border: isActive ? '1px solid rgba(0, 255, 136, 0.3)' : 'none',
      fontWeight: isActive ? '600' : '500',
      fontSize: '14px',
      transition: 'all 200ms ease-in-out',
      opacity: isDisabled ? 0.5 : 1,
      position: 'relative',
    });

    const iconStyle: React.CSSProperties = {
      fontSize: '20px',
      minWidth: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const labelStyle: React.CSSProperties = {
      whiteSpace: 'nowrap',
      opacity: collapsed ? 0 : 1,
      transition: 'opacity 200ms ease-in-out',
      flex: collapsed ? 0 : 1,
    };

    const badgeStyle: React.CSSProperties = {
      background: 'linear-gradient(135deg, #ef4444, #f87171)',
      color: 'white',
      padding: '2px 6px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: '700',
      minWidth: '20px',
      textAlign: 'center',
      opacity: collapsed ? 0 : 1,
      transition: 'opacity 200ms ease-in-out',
    };

    return (
      <div ref={ref} style={navStyle} className={className} {...props}>
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          style={toggleButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.color = '#00ff88';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '→' : '←'}
        </button>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && onItemClick(item.id)}
              disabled={item.disabled}
              style={itemStyle(item.id === activeItemId, item.disabled || false)}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (item.id !== activeItemId) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              <div style={iconStyle}>{item.icon}</div>
              <div style={labelStyle}>{item.label}</div>
              {item.badge && item.badge > 0 && (
                <div style={badgeStyle}>{item.badge}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

Navigation.displayName = 'Navigation';

export default Navigation;
