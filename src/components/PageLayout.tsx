'use client';

import React from 'react';

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    { header, sidebar, footer, sidebarPosition = 'left', children, className, style, ...props },
    ref
  ) => {
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      flexShrink: 0,
    };

    const mainContainerStyle: React.CSSProperties = {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    };

    const sidebarStyle: React.CSSProperties = {
      flexShrink: 0,
      overflow: 'auto',
      ...(sidebarPosition === 'right' && {
        order: 2,
      }),
    };

    const contentStyle: React.CSSProperties = {
      flex: 1,
      overflow: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      ...(sidebarPosition === 'right' && {
        order: 1,
      }),
    };

    const footerStyle: React.CSSProperties = {
      flexShrink: 0,
      padding: '16px 24px',
      borderTop: '1px solid rgba(0, 255, 136, 0.1)',
      background: 'rgba(10, 14, 39, 0.4)',
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.6)',
    };

    return (
      <div ref={ref} style={containerStyle} className={className} {...props}>
        {/* Header */}
        {header && <div style={headerStyle}>{header}</div>}

        {/* Main Container */}
        <div style={mainContainerStyle}>
          {/* Sidebar */}
          {sidebar && <div style={sidebarStyle}>{sidebar}</div>}

          {/* Content */}
          <div style={contentStyle}>{children}</div>
        </div>

        {/* Footer */}
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';

export default PageLayout;
