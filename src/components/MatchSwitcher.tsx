"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/config";

// Dropdown to switch which analyzed match the screen shows (via ?match=<id>).
export default function MatchSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [matches, setMatches] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    createClient()
      .from("matches")
      .select("id,title,created_at")
      .or("ball_analysis.not.is.null,shot_analysis.not.is.null")
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setMatches((data as { id: string; title: string }[] | null)?.map((m) => ({ id: m.id, title: m.title })) || [])
      );
  }, []);

  if (matches.length <= 1) return null;

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="dim" style={{ fontSize: 12.5 }}>Match</span>
      <select
        value={current}
        onChange={(e) => router.push(`${pathname}?match=${e.target.value}`)}
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border-light)",
          borderRadius: 9,
          padding: "8px 10px",
          fontSize: 13.5,
          fontWeight: 600,
          maxWidth: 240,
        }}
      >
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
    </label>
  );
}
