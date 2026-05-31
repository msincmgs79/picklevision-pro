'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlighted';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      shadow = 'md',
      padding = 'md',
      hoverable = false,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      borderRadius: '8px',
      background: 'rgba(10, 14, 39, 0.5)',
      border: '1px solid rgba(0, 255, 136, 0.1)',
      transition: 'all 200ms ease-in-out',
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: 'rgba(10, 14, 39, 0.5)',
        border: '1px solid rgba(0, 255, 136, 0.1)',
      },
      interactive: {
        background: 'rgba(10, 14, 39, 0.7)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        cursor: 'pointer',
      },
      highlighted: {
        background: 'rgba(0, 255, 136, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
      },
    };

    // Shadow styles
    const shadowStyles: Record<string, React.CSSProperties> = {
      none: {
        boxShadow: 'none',
      },
      sm: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
      md: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
      lg: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    };

    // Padding styles
    const paddingStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: '12px',
      },
      md: {
        padding: '16px',
      },
      lg: {
        padding: '24px',
      },
    };

    // Hoverable styles (inline styles don't support :hover pseudo-class)
    const hoverableStyles: React.CSSProperties = hoverable ? { cursor: 'pointer' } : {};

    // Combine all styles
    const finalStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...shadowStyles[shadow],
      ...paddingStyles[padding],
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

// CardHeader subcomponent
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ divider = true, children, className, style, ...props }, ref) => {
    const headerStyle: React.CSSProperties = {
      paddingBottom: '12px',
      marginBottom: '12px',
      borderBottom: divider ? '1px solid rgba(0, 255, 136, 0.1)' : 'none',
      ...style,
    };

    return (
      <div ref={ref} style={headerStyle} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// CardBody subcomponent
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, style, ...props }, ref) => {
    const bodyStyle: React.CSSProperties = {
      ...style,
    };

    return (
      <div ref={ref} style={bodyStyle} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// CardFooter subcomponent
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ divider = true, children, className, style, ...props }, ref) => {
    const footerStyle: React.CSSProperties = {
      paddingTop: '12px',
      marginTop: '12px',
      borderTop: divider ? '1px solid rgba(0, 255, 136, 0.1)' : 'none',
      ...style,
    };

    return (
      <div ref={ref} style={footerStyle} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardBody, CardFooter };
export default Card;
