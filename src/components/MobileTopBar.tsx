"use client";

import Link from "next/link";

// Shown only on small screens (the sidebar — and its Upgrade CTA — is hidden
// there). Gives mobile a brand presence and a persistent upgrade entry point.
export default function MobileTopBar() {
  return (
    <div className="mobile-topbar">
      <Link href="/" className="brand" style={{ padding: 0, gap: 9 }}>
        <div className="brand-logo" style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", overflow: "hidden" }}>
          <img src="/logo.png" alt="PickleVision" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div className="brand-name" style={{ fontSize: 15 }}>
          Pickle<span>Vision</span>
        </div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/account" className="btn btn-sm" aria-label="My account" style={{ padding: "6px 11px" }}>◎</Link>
        <Link href="/upgrade" className="btn btn-primary btn-sm">✦ Upgrade</Link>
      </div>
    </div>
  );
}
