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
  variant?: 'default' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      activeTab,
      onTabChange,
      variant = 'default',
      size = 'md',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const getTabButtonStyles = (isActive: boolean, isDisabled: boolean): React.CSSProperties => {
      const baseStyles: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: isDisabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.6)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 150ms ease-in-out',
        position: 'relative',
      };

      const sizeStyles: Record<string, React.CSSProperties> = {
        sm: { padding: '8px 12px', fontSize: '12px' },
        md: { padding: '10px 16px', fontSize: '14px' },
        lg: { padding: '12px 20px', fontSize: '16px' },
      };

      if (variant === 'default') {
        return {
          ...baseStyles,
          ...sizeStyles[size],
          color: isActive ? '#00ff88' : baseStyles.color,
          borderBottom: isActive ? '2px solid #00ff88' : '1px solid rgba(0, 255, 136, 0.1)',
          paddingBottom: isActive ? '8px' : '9px',
        };
      } else {
        // pills variant
        return {
          ...baseStyles,
          ...sizeStyles[size],
          borderRadius: '9999px',
          background: isActive
            ? 'linear-gradient(90deg, #00ff88, #00d4ff)'
            : 'rgba(0, 255, 136, 0.1)',
          color: isActive ? '#0a0e27' : '#00ff88',
        };
      }
    };

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: variant === 'default' ? '24px' : '12px',
      borderBottom: variant === 'default' ? '1px solid rgba(0, 255, 136, 0.1)' : 'none',
      paddingBottom: '12px',
      ...style,
    };

    return (
      <div ref={ref} style={containerStyles} className={className} {...props}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onTabChange(item.id)}
            disabled={item.disabled}
            style={getTabButtonStyles(item.id === activeTab, item.disabled || false)}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

export default Tabs;
