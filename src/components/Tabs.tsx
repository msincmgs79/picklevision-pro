'use client';

import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills';
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      activeTab,
      onTabChange,
      size = 'md',
      variant = 'default',
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Base container styles - using React.CSSProperties (CORRECT)
    const baseContainerStyles: React.CSSProperties = {
      display: 'flex',
      gap: '16px',
      borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
      width: '100%',
      overflowX: 'auto',
    };

    // Variant container styles
    const variantContainerStyles: Record<string, React.CSSProperties> = {
      default: baseContainerStyles,
      pills: {
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 255, 136, 0.1)',
        width: 'auto',
      },
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 12px', fontSize: '12px' },
      md: { padding: '10px 14px', fontSize: '14px' },
      lg: { padding: '12px 16px', fontSize: '16px' },
    };

    // Tab button base styles
    const baseButtonStyles: React.CSSProperties = {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 150ms ease-in-out',
      whiteSpace: 'nowrap',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      position: 'relative',
      color: 'white',
    };

    // Get tab button styles
    const getTabButtonStyles = (isActive: boolean, isDisabled: boolean): React.CSSProperties => {
      const styles: React.CSSProperties = { ...baseButtonStyles, ...sizeStyles[size] };

      if (isDisabled) {
        return { ...styles, opacity: 0.5, cursor: 'not-allowed' };
      }

      if (variant === 'pills') {
        if (isActive) {
          return {
            ...styles,
            background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
            color: '#000',
            borderRadius: '6px',
            padding: '6px 12px',
          };
        }
        return {
          ...styles,
          color: 'rgba(255, 255, 255, 0.6)',
          padding: '6px 12px',
        };
      }

      // Default variant
      if (isActive) {
        return {
          ...styles,
          color: '#00ff88',
          borderBottom: '2px solid #00ff88',
          paddingBottom: '10px',
        };
      }
      return {
        ...styles,
        color: 'rgba(255, 255, 255, 0.6)',
        paddingBottom: '12px',
      };
    };

    const containerStyle: React.CSSProperties = {
      ...variantContainerStyles[variant],
      ...style,
    };

    return (
      <div ref={ref} style={containerStyle} className={className} {...props}>
        {items.map((item) => {
          const isActive = item.id === activeTab;
          const isDisabled = item.disabled || false;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isDisabled) {
                  onTabChange(item.id);
                }
              }}
              disabled={isDisabled}
              style={getTabButtonStyles(isActive, isDisabled)}
              aria-selected={isActive}
              role="tab"
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

export default Tabs;
