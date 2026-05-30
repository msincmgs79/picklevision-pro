'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlighted';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

interface CardCompositionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      shadow = 'md',
      padding = 'md',
      hoverable = false,
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles - using React.CSSProperties (CORRECT)
    const baseStyles: React.CSSProperties = {
      borderRadius: '12px',
      transition: 'all 250ms ease-in-out',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        color: 'white',
      },
      interactive: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        color: 'white',
        cursor: 'pointer',
      },
      highlighted: {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        color: 'white',
      },
    };

    // Shadow styles
    const shadowStyles: Record<string, React.CSSProperties> = {
      none: {},
      sm: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      md: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
      lg: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
    };

    // Padding styles
    const paddingStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '12px' },
      md: { padding: '16px' },
      lg: { padding: '24px' },
    };

    // Hover styles (only for interactive variant)
    const hoverStyles: React.CSSProperties =
      hoverable || variant === 'interactive'
        ? {
            cursor: 'pointer',
          }
        : {};

    // Combine all styles
    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...shadowStyles[shadow],
      ...paddingStyles[padding],
      ...hoverStyles,
      ...style,
    };

    return (
      <div ref={ref} style={finalStyle} className={className} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header sub-component
const CardHeader = React.forwardRef<HTMLDivElement, CardCompositionProps>(
  ({ className, children, style, ...props }, ref) => {
    const headerStyles: React.CSSProperties = {
      borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
      paddingBottom: '12px',
      marginBottom: '12px',
      ...style,
    };

    return (
      <div ref={ref} style={headerStyles} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Body sub-component
const CardBody = React.forwardRef<HTMLDivElement, CardCompositionProps>(
  ({ className, children, style, ...props }, ref) => (
    <div ref={ref} style={style} className={className} {...props}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

// Card Footer sub-component
const CardFooter = React.forwardRef<HTMLDivElement, CardCompositionProps>(
  ({ className, children, style, ...props }, ref) => {
    const footerStyles: React.CSSProperties = {
      borderTop: '1px solid rgba(0, 255, 136, 0.1)',
      paddingTop: '12px',
      marginTop: '12px',
      ...style,
    };

    return (
      <div ref={ref} style={footerStyles} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardBody, CardFooter };
export default Card;
