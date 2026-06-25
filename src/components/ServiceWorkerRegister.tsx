"use client";

import { useEffect } from "react";

// Registers the service worker (offline shell + installability). No UI.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
