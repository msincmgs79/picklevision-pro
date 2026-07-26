"use client";

import { useEffect } from "react";

// Registers the service worker (offline shell + installability) and keeps the
// app auto-updating: when a new deploy's service worker takes control, the page
// reloads once so the user is always on the latest version — no manual
// hard-refresh needed.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Reload once when a new service worker takes control (a new version
    // activated). Guarded so it never loops, and skipped on the very first
    // registration (when there was no controller yet) to avoid a needless reload.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Check for a new version now and each time the tab becomes visible, so
        // a long-open PWA picks up deploys without being manually reloaded.
        const check = () => reg.update().catch(() => {});
        check();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      })
      .catch(() => {});
  }, []);
  return null;
}
