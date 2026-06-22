"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "▦" },
  { href: "/matches", label: "Matches", icon: "▤" },
  { href: "/analysis", label: "Shots", icon: "✦" },
  { href: "/ratings", label: "Ratings", icon: "★" },
  { href: "/record", label: "Record", icon: "●" },
];

// Bottom tab bar shown only on small screens (the sidebar is hidden there).
export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav">
      {items.map((i) => {
        const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={"mnav-link" + (active ? " active" : "")}>
            <span className="mnav-icon">{i.icon}</span>
            <span>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
