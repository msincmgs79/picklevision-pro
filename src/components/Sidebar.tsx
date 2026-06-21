"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { section: "Overview" },
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/record", label: "Record & Upload", icon: "●" },
  { section: "Analysis" },
  { href: "/analysis", label: "Shot Explorer", icon: "✦" },
  { href: "/review", label: "Video Review", icon: "▷" },
  { section: "Progress" },
  { href: "/ratings", label: "Ratings & Team", icon: "★" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-logo">🥒</div>
        <div className="brand-name">
          Pickle<span>Vision</span>
        </div>
      </Link>

      {links.map((l, i) =>
        "section" in l ? (
          <div key={i} className="nav-section">
            {l.section}
          </div>
        ) : (
          <Link
            key={l.href}
            href={l.href!}
            className={
              "nav-link" +
              (pathname === l.href ? " active" : "")
            }
          >
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </Link>
        )
      )}

      <div style={{ marginTop: "auto", padding: "12px 10px 4px" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>DUPR Connected</div>
          <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 2 }}>
            Rating 4.412 · +0.06
          </div>
        </div>
      </div>
    </aside>
  );
}
