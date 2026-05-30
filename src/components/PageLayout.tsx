'use client';

import React from 'react';

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  showSidebar?: boolean;
  mainContentMaxWidth?: string;
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      header,
      sidebar,
      footer,
      children,
      sidebarPosition = 'left',
      showSidebar = true,
      mainContentMaxWidth = '100%',
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles - using React.CSSProperties (CORRECT)
    const pageLayoutStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)',
      color: 'white',
      ...style,
    };

    return (
      <div ref={ref} style={pageLayoutStyles} className={className} {...props}>
        {/* Header Section */}
        {header && (
          <div
            style={{
              flexShrink: 0,
              width: '100%',
            }}
          >
            {header}
          </div>
        )}

        {/* Main Content Grid (Header + Sidebar + Content) */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar - Left Position */}
          {showSidebar && sidebarPosition === 'left' && sidebar && (
            <aside
              style={{
                flexShrink: 0,
                overflow: 'auto',
              }}
            >
              {sidebar}
            </aside>
          )}

          {/* Main Content Area */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: mainContentMaxWidth,
              overflow: 'auto',
              backgroundColor: 'transparent',
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '24px 32px',
                minHeight: '100%',
              }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <footer
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid rgba(0, 255, 136, 0.1)',
                  padding: '16px 32px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {footer}
              </footer>
            )}
          </main>

          {/* Sidebar - Right Position */}
          {showSidebar && sidebarPosition === 'right' && sidebar && (
            <aside
              style={{
                flexShrink: 0,
                borderLeft: '1px solid rgba(0, 255, 136, 0.1)',
                overflow: 'auto',
              }}
            >
              {sidebar}
            </aside>
          )}
        </div>
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';

export default PageLayout;
