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
      bord