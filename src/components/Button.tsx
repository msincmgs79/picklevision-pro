'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      children,
      disabled,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles - using React.CSSProperties
    const baseStyles: React.CSSProperties = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      fontWeight: '600',
      borderRadius: '6px',
      border: 'none',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 150ms ease-in-out',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      outline: 'none',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
        color: '#0a0e27',
      },
      secondary: {
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        color: '#00ff88',
      },
      success: {
        background: 'linear-gradient(90deg, #10b981, #34d399)',
        color: 'white',
      },
      danger: {
        background: 'linear-gradient(90deg, #ef4444, #f87171)',
        color: 'white',
      },
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: '6px 12px',
        fontSize: '12px',
        minHeight: '32px',
      },
      md: {
        padding: '10px 16px',
        fontSize: '14px',
        minHeight: '40px',
      },
      lg: {
        padding: '12px 20px',
        fontSize: '16px',
        minHeight: '48px',
      },
    };

    // Width styles
    const widthStyles: React.CSSProperties = fullWidth ? { width: '100%' } : {};

    // Disabled/loading styles
    const disabledStyles: React.CSSProperties = disabled || loading ? { opacity: 0.6 } : {};

    // Combine all button styles
    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...widthStyles,
      ...disabledStyles,
      ...style,
    };

    return (
      <button
        ref={ref}
        style={finalStyle}
        disabled={disabled || loading}
        className={className}
        {...props}
      >
        {loading && (
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid currentColor',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
