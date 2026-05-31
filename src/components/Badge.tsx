'use client';

import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      dismissible = false,
      onDismiss,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(true);

    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '9999px',
      fontWeight: '600',
      transition: 'all 150ms ease-in-out',
      cursor: dismissible ? 'pointer' : 'default',
      border: 'none',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
        color: '#0a0e27',
      },
      success: {
        background: 'linear-gradient(135deg, #10b981, #34d399)',
        color: 'white',
      },
      danger: {
        background: 'linear-gradient(135deg, #ef4444, #f87171)',
        color: 'white',
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        color: '#0a0e27',
      },
      secondary: {
        background: 'rgba(0, 255, 136, 0.1)',
        color: '#00ff88',
        border: '1px solid rgba(0, 255, 136, 0.3)',
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: '4px 8px',
        fontSize: '11px',
      },
      md: {
        padding: '6px 12px',
        fontSize: '12px',
      },
      lg: {
        padding: '8px 16px',
        fontSize: '13px',
      },
    };

    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      opacity: visible ? 1 : 0,
      ...style,
    };

    if (!visible) return null;

    return (
      <span ref={ref} style={finalStyle} className={className} {...props}>
        {children}
        {dismissible && (
          <button
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '0',
              fontSize: '14px',
              opacity: 0.7,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '0.7';
            }}
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
