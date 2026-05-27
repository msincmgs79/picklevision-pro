import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/authContext';

export const metadata: Metadata = {
  title: 'PickleVision Pro',
  description: 'Professional Pickleball Analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
