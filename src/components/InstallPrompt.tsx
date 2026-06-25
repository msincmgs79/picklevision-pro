"use client";

import { useEffect, useState } from "react";

// Captures Chrome/Android's beforeinstallprompt and offers a custom
// "Install" button (better conversion than the browser's default chip).
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || hidden) return null;

  async function install() {
    const e = deferred;
    setDeferred(null);
    try {
      e.prompt();
      await e.userChoice;
    } catch {}
  }

  return (
    <div className="install-banner">
      <div className="brand-logo" style={{ width: 34, height: 34, background: "transparent", overflow: "hidden", flexShrink: 0 }}>
        <img src="/logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Install PickleVision</div>
        <div className="muted" style={{ fontSize: 12 }}>Full-screen, app-like, one tap from your home screen.</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={install}>Install</button>
      <button className="iconbtn" onClick={() => setHidden(true)} aria-label="Dismiss" style={{ width: 30, height: 30 }}>✕</button>
    </div>
  );
}
