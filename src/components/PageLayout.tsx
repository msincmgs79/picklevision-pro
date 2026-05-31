'use client';

import React, { useState, useEffect } from 'react';

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
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
      const checkSize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkSize();
      window.addEventListener('resize', checkSize);
      return () => window.removeEventListener('resize', checkSize);
    }, []);

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
      position: 'relative',
    };

    const sidebarStyle: React.CSSProperties = {
      flexShrink: 0,
      overflow: 'auto',
      ...(isMobile && {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        width: '280px',
      }),
      ...(sidebarPosition === 'right' && {
        order: 2,
      }),
    };

    const contentStyle: React.CSSProperties = {
      flex: 1,
      overflow: 'auto',
      padding: isMobile ? '16px' : '24px',
      display: 'flex',
      flexDirection: 'column',
      ...(sidebarPosition === 'right' && {
        order: 1,
      }),
    };

    const footerStyle: React.CSSProperties = {
      flexShrink: 0,
      padding: isMobile ? '12px 16px' : '16px 24px',
      borderTop: '1px solid rgba(0, 255, 136, 0.1)',
      background: 'rgba(10, 14, 39, 0.4)',
      fontSize: isMobile ? '12px' : '13px',
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
    };

    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
      display: sidebarOpen && isMobile ? 'block' : 'none',
    };

    return (
      <div ref={ref} style={containerStyle} className={className} {...props}>
        {/* Header */}
        {header && <div style={headerStyle}>{header}</div>}

        {/* Main Container */}
        <div style={mainContainerStyle}>
          {/* Sidebar Overlay (Mobile) */}
          {isMobile && <div style={overlayStyle} onClick={() => setSidebarOpen(false)} />}

          {/* Sidebar */}
          {sidebar && (
            <div style={sidebarStyle}>
              {isMobile && (
                <div
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                  }}
                >
                  ✕
                </div>
              )}
              {sidebar}
            </div>
          )}

          {/* Content */}
          <div style={contentStyle}>{children}</div>
        </div>

        {/* Footer */}
        {footer && <div style={footerStyle}>{footer}</div>}

        {/* Mobile Menu Toggle (Hamburger) */}
        {isMobile && sidebar && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              border: 'none',
              color: '#0a0e27',
              fontSize: '24px',
              cursor: 'pointer',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            ☰
          </button>
        )}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';

export default PageLayout;
