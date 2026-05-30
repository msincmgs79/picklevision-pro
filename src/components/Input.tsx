'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'md',
      label,
      error,
      helperText,
      fullWidth = false,
      icon,
      className,
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine variant based on error prop
    const finalVariant = error ? 'error' : variant;

    // Base styles - using React.CSSProperties (CORRECT)
    const baseStyles: React.CSSProperties = {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '6px',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      transition: 'all 150ms ease-in-out',
      outline: 'none',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        border: '1px solid rgba(0, 255, 136, 0.2)',
      },
      error: {
        border: '1px solid rgba(220, 38, 38, 0.4)',
      },
      success: {
        border: '1px solid rgba(34, 197, 94, 0.4)',
      },
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 12px', fontSize: '12px', height: '32px' },
      md: { padding: '10px 14px', fontSize: '14px', height: '40px' },
      lg: { padding: '12px 16px', fontSize: '16px', height: '48px' },
    };

    // Width styles
    const widthStyles: React.CSSProperties = fullWidth ? { width: '100%' } : {};

    // Disabled styles
    const disabledStyles: React.CSSProperties = disabled
      ? { opacity: 0.6, cursor: 'not-allowed' }
      : {};

    // Combine all input styles
    const inputStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[finalVariant],
      ...sizeStyles[inputSize],
      ...widthStyles,
      ...disabledStyles,
      ...(icon && { paddingLeft: '40px' }),
      ...style,
    };

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: fullWidth ? '100%' : 'auto',
    };

    return (
      <div style={containerStyles}>
        {label && (
          <label
            style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '13px',
              marginBottom: '2px',
              fontWeight: '500',
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
          }}
        >
          <input
            ref={ref}
            style={inputStyle}
            disabled={disabled}
            className={className}
            {...props}
          />
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </span>
          )}
        </div>

        {error && (
          <span
            style={{
              color: '#dc2626',
              fontSize: '12px',
            }}
          >
            ⚠ {error}
          </span>
        )}

        {helperText && !error && (
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
