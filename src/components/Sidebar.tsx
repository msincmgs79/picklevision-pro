"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/config";

const links = [
  { section: "Overview" },
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/matches", label: "My Matches", icon: "▤" },
  { href: "/record", label: "Record & Upload", icon: "●" },
  { section: "Analysis" },
  { href: "/analysis", label: "Shot Explorer", icon: "✦" },
  { href: "/review", label: "Video Review", icon: "▷" },
  { section: "Progress" },
  { href: "/ratings", label: "Ratings & Team", icon: "★" },
  { section: "Account" },
  { href: "/account", label: "My Account", icon: "◎" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-logo" style={{ background: "transparent", overflow: "hidden" }}>
          <img src="/logo.png" alt="PickleVision" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
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
          <Link key={l.href} href={l.href!} className={"nav-link" + (pathname === l.href ? " active" : "")}>
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </Link>
        )
      )}

      <div style={{ marginTop: "auto", padding: "12px 6px 4px" }}>
        <Link href="/upgrade" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 13, marginBottom: 10 }}>
          ✦ Upgrade plan
        </Link>
        {email ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <Link
              href="/account"
              title="View your account"
              style={{ display: "block", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)", textDecoration: "none" }}
            >
              {email}
            </Link>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Link
                href="/account"
                style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 12.5, textDecoration: "none" }}
              >
                Account
              </Link>
              <button
                onClick={signOut}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: 0 }}
              >
                Sign out →
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 13.5 }}
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
