import type { Metadata } from 'next';

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
                        <link href="https://cdn.tailwindcss.com" rel="stylesheet" />
                </head>head>
                <body>
                  {children}
                </body>body>
          </html>html>
        );
}</html>
