import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import MobileTopBar from "../components/MobileTopBar";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import InstallPrompt from "../components/InstallPrompt";
import { createClient } from "../lib/supabase/server";
import { isSupabaseConfigured } from "../lib/supabase/config";

const SITE_URL = "https://picklevision-clean.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PickleVision — AI Pickleball Video Analysis, Ratings & Coaching",
    template: "%s · PickleVision",
  },
  description:
    "Turn your pickleball match video into an AI coaching breakdown — shot-by-shot skill ratings on the DUPR scale, ball tracking, rally highlights and court-coverage heatmaps. Free to start, installable on any device.",
  applicationName: "PickleVision",
  keywords: [
    "pickleball",
    "AI pickleball analysis",
    "pickleball video analysis",
    "pickleball stats app",
    "DUPR rating estimate",
    "pickleball coaching app",
    "pickleball shot tracker",
    "analyze pickleball game video",
    "pickleball court coverage heatmap",
  ],
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0e1a",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PickleVision",
    url: SITE_URL,
    title: "PickleVision — AI Pickleball Video Analysis, Ratings & Coaching",
    description:
      "Upload a match, get AI shot ratings, ball tracking, court-coverage heatmaps and a DUPR-scale skill estimate — in minutes, on any device.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "PickleVision" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PickleVision — AI Pickleball Video Analysis",
    description:
      "Turn your pickleball match video into an AI coaching breakdown — ratings, ball tracking, court-coverage heatmaps.",
    images: ["/logo.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PickleVision" },
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Show the app chrome (sidebar / mobile nav) only to signed-in users, so the
  // marketing landing and login pages render clean and full-width.
  let loggedIn = false;
  try {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      loggedIn = !!user;
    }
  } catch {
    loggedIn = false;
  }

  return (
    <html lang="en">
      <body>
        {loggedIn ? (
          <>
            <MobileTopBar />
            <div className="app">
              <Sidebar />
              <main className="main">{children}</main>
            </div>
            <MobileNav />
          </>
        ) : (
          <div className="app">
            <main className="main">{children}</main>
          </div>
        )}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
