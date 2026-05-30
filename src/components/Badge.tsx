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
    const [isDismissed, setIsDismissed] = React.useState(false);

    if (isDismissed) {
      return null;
    }

    // Base styles - using React.CSSProperties (CORRECT)
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontWeight: '600',
      borderRadius: '9999px',
      transition: 'all 150ms ease-in-out',
      whiteSpace: 'nowrap',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
        color: '#000',
      },
      success: {
        background: 'linear-gradient(90deg, #22c55e, #16a34a)',
        color: 'white',
      },
      danger: {
        background: 'linear-gradient(90deg, #dc2626, #991b1b)',
        color: 'white',
      },
      warning: {
        background: 'linear-gradient(90deg, #f59e0b, #d97706)',
        color: 'white',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        color: 'rgba(255, 255, 255, 0.8)',
      },
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '4px 8px', fontSize: '11px' },
      md: { padding: '6px 12px', fontSize: '12px' },
      lg: { padding: '8px 16px', fontSize: '13px' },
    };

    // Combine all styles
    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    const handleDismiss = () => {
      setIsDismissed(true);
      onDismiss?.();
    };

    return (
      <span ref={ref} style={finalStyle} className={className} {...props}>
        {children}
        {dismissible && (
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1',
              marginLeft: '4px',
              opacity: 0.8,
              transition: 'opacity 150ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
            }}
            aria-label="Dismiss"
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
