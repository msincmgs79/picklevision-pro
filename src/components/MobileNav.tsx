"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const left = [
  { href: "/", label: "Home", icon: "▦" },
  { href: "/matches", label: "Matches", icon: "▤" },
];
const right = [
  { href: "/analysis", label: "Shots", icon: "✦" },
  { href: "/ratings", label: "Ratings", icon: "★" },
];

// Bottom tab bar shown only on small screens (the sidebar is hidden there).
// The centre Record action is a raised FAB — the signature primary action.
export default function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <nav className="mobile-nav">
      {left.map((i) => (
        <Link key={i.href} href={i.href} className={"mnav-link" + (isActive(i.href) ? " active" : "")}>
          <span className="mnav-icon">{i.icon}</span>
          <span>{i.label}</span>
        </Link>
      ))}
      <Link href="/record" className="mnav-fab" aria-label="Record or upload a match">
        <span aria-hidden="true">＋</span>
      </Link>
      {right.map((i) => (
        <Link key={i.href} href={i.href} className={"mnav-link" + (isActive(i.href) ? " active" : "")}>
          <span className="mnav-icon">{i.icon}</span>
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
