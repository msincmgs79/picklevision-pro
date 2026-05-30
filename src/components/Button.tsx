'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      children,
      disabled,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles - using React.CSSProperties (CORRECT)
    const baseStyles: React.CSSProperties = {
      fontWeight: '700',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      border: 'none',
      borderRadius: '6px',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 150ms ease-in-out',
      opacity: disabled || isLoading ? 0.5 : 1,
      fontSize: '14px',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
        color: '#0a0e27',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        border: '1px solid rgba(0, 255, 136, 0.2)',
      },
      success: {
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: 'white',
      },
      danger: {
        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
        color: 'white',
      },
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 12px', fontSize: '12px' },
      md: { padding: '12px 16px', fontSize: '14px' },
      lg: { padding: '16px 20px', fontSize: '16px' },
    };

    // Width styles
    const widthStyles: React.CSSProperties = fullWidth ? { width: '100%' } : {};

    // Combine all styles
    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...widthStyles,
      ...style,
    };

    return (
      <button
        ref={ref}
        style={finalStyle}
        disabled={disabled || isLoading}
        className={className}
        {...props}
      >
        {isLoading ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid rgba(10, 14, 39, 0.3)',
                borderTop: '2px solid #0a0e27',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
