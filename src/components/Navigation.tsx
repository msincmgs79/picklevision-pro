'use client';

import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  disabled?: boolean;
  badge?: number;
}

interface NavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[];
  activeItemId: string;
  onItemClick: (itemId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: 'default' | 'compact';
}

const Navigation = React.forwardRef<HTMLDivElement, NavigationProps>(
  (
    {
      items,
      activeItemId,
      onItemClick,
      collapsed = false,
      onToggleCollapse,
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => {
    // Base styles - using React.CSSProperties (CORRECT)
    const navStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRight: '1px solid rgba(0, 255, 136, 0.15)',
      transition: 'all 250ms ease-in-out',
      overflowY: 'auto',
      overflowX: 'hidden',
      width: collapsed ? '80px' : '280px',
    };

    return (
      <nav ref={ref} style={navStyles} className={className} {...props}>
        {/* Navigation Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 12px',
            borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
            minHeight: '60px',
            gap: '8px',
          }}
        >
          {!collapsed && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Menu
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '18px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 150ms ease-in-out',
              marginLeft: collapsed ? 'auto' : 'auto',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.6)';
            }}
            aria-label="Toggle navigation"
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation Items Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px 8px',
            flex: 1,
          }}
        >
          {items.map((item) => {
            const isActive = item.id === activeItemId;
            const isDisabled = item.disabled || false;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isDisabled) {
                    onItemClick(item.id);
                  }
                }}
                disabled={isDisabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isActive
                    ? 'rgba(0, 255, 136, 0.15)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(0, 255, 136, 0.3)'
                    : '1px solid transparent',
                  borderRadius: '6px',
                  color: isActive ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease-in-out',
                  fontSize: '14px',
                  fontWeight: isActive ? '500' : '400',
                  minHeight: '36px',
                  opacity: isDisabled ? 0.5 : 1,
                  position: 'relative',
                  width: '100%',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                {/* Icon Container */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>

                {/* Label (hidden when collapsed) */}
                {!collapsed && (
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                )}

                {/* Badge (only when not collapsed) */}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
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
                      flexShrink: 0,
                    }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Footer */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 255, 136, 0.1)',
            padding: '12px 8px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
          }}
        >
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'rgba(0, 255, 136, 0.15)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '6px',
              color: '#00ff88',
              cursor: 'pointer',
              fontSize: '16px',
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
            aria-label="Settings"
            title={collapsed ? 'Settings' : undefined}
          >
            ⚙️
          </button>
          {!collapsed && (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: 'rgba(0, 255, 136, 0.15)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                borderRadius: '6px',
                color: '#00ff88',
                cursor: 'pointer',
                fontSize: '16px',
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
              aria-label="Help"
            >
              ❓
            </button>
          )}
        </div>
      </nav>
    );
  }
);

Navigation.displayName = 'Navigation';

export default Navigation;
