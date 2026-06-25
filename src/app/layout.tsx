import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import MobileTopBar from "../components/MobileTopBar";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import InstallPrompt from "../components/InstallPrompt";

export const metadata: Metadata = {
  title: "PickleVision Pro — AI Pickleball Analysis",
  description:
    "Record, analyze and review your pickleball games with AI shot tracking, 3D trajectories, heatmaps and skill ratings.",
  manifest: "/manifest.webmanifest",
  applicationName: "PickleVision",
  themeColor: "#0a0e1a",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PickleVision",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MobileTopBar />
        <div className="app">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
        <MobileNav />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
