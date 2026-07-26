import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { loadSharedMatch, SKILL_LABELS, type SharedMatch } from "../../../lib/share";
import type { SkillRatings } from "../../../lib/analysis";

export const dynamic = "force-dynamic";

// Dedupe the DB read across generateMetadata + the page render (same request).
const getShared = cache((token: string) => loadSharedMatch(token));

const C = {
  bg: "#0a0e1a",
  panel: "rgba(255,255,255,0.04)",
  border: "rgba(163,230,53,0.22)",
  borderSoft: "rgba(255,255,255,0.08)",
  lime: "#a3e635",
  white: "#f8fafc",
  muted: "#94a3b8",
  win: "#22c55e",
  loss: "#f87171",
  track: "rgba(255,255,255,0.07)",
};

function teamsLine(m: SharedMatch): string {
  if (m.team && m.opponent) return `${m.team} vs ${m.opponent}`;
  return m.team || m.opponent || "";
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const m = await getShared(params.token);
  if (!m) {
    return { title: "Shared match", robots: { index: false, follow: false } };
  }
  const teams = teamsLine(m);
  const title = `${m.title} — AI rating ${m.rating.toFixed(1)}`;
  const description =
    m.coachTip ||
    m.summary ||
    `AI pickleball analysis${teams ? ` · ${teams}` : ""} — ${m.rating.toFixed(1)} on the DUPR scale.`;
  const url = `/s/${params.token}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // User-shared match links unfurl (OG) but are not indexed by default — privacy.
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images: [{ url: "/logo.png", width: 512, height: 512, alt: "PickleVision" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"],
    },
  };
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 22 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={30} height={30} style={{ borderRadius: 7 }} />
      <span style={{ color: C.white }}>
        Pickle<span style={{ color: C.lime }}>Vision</span>
      </span>
    </div>
  );
}

function Unavailable() {
  return (
    <div style={{ color: C.white, padding: "20px 0 40px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Brand />
        </div>
        <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>This match link isn’t available</h1>
        <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.5, margin: "0 0 28px" }}>
          The link may have been turned off, or it hasn’t finished analysis yet.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: C.lime,
            color: "#0a0e1a",
            fontWeight: 800,
            padding: "13px 22px",
            borderRadius: 12,
            textDecoration: "none",
          }}
        >
          Analyze your own match — free →
        </Link>
      </div>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  // DUPR scale ~2..8 → 0..100% of the bar.
  const pct = Math.max(0, Math.min(1, (value - 2) / 6)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 96, flexShrink: 0, color: C.muted, fontSize: 13, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 9, background: C.track, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: C.lime, borderRadius: 999 }} />
      </div>
      <span style={{ width: 34, flexShrink: 0, textAlign: "right", color: C.white, fontWeight: 700, fontSize: 13 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default async function SharedMatchPage({ params }: { params: { token: string } }) {
  const m = await getShared(params.token);
  if (!m) return <Unavailable />;

  const teams = teamsLine(m);
  const date = m.date ? new Date(m.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  const skills = Object.keys(SKILL_LABELS) as (keyof SkillRatings)[];

  return (
    <div style={{ color: C.white }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* Brand + shared tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <Brand />
          <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Shared analysis
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 8px", fontWeight: 800 }}>{m.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
          {teams && <span style={{ color: C.muted, fontSize: 15 }}>{teams}</span>}
          {m.result && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: m.result === "win" ? C.win : C.loss,
                background: m.result === "win" ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)",
              }}
            >
              {m.result}
            </span>
          )}
          {date && <span style={{ color: C.muted, fontSize: 13 }}>{date}</span>}
        </div>

        {/* Rating hero */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginBottom: 20,
          }}
        >
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ color: C.lime, fontSize: 58, fontWeight: 800, lineHeight: 1 }}>{m.rating.toFixed(1)}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>AI DUPR estimate</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {m.topSkill && (
              <div style={{ marginBottom: 8, fontSize: 15 }}>
                <span style={{ color: C.muted }}>Top skill · </span>
                <span style={{ color: C.white, fontWeight: 700 }}>
                  {m.topSkill.label} {m.topSkill.value.toFixed(1)}
                </span>
              </div>
            )}
            {m.summary && <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{m.summary}</p>}
          </div>
        </div>

        {/* Skill breakdown */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, color: C.muted, margin: "0 0 16px" }}>
            Skill breakdown
          </h2>
          {skills.map((k) => (
            <SkillBar key={k} label={SKILL_LABELS[k]} value={m.ratings[k]} />
          ))}
        </div>

        {/* Coach tip */}
        {m.coachTip && (
          <div
            style={{
              background: "rgba(163,230,53,0.06)",
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: "18px 22px",
              marginBottom: 20,
            }}
          >
            <div style={{ color: C.lime, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Coach tip
            </div>
            <p style={{ color: C.white, fontSize: 16, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>“{m.coachTip}”</p>
          </div>
        )}

        {/* Strengths / improvements */}
        {(m.strengths.length > 0 || m.improvements.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
            {m.strengths.length > 0 && (
              <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: 18, padding: "18px 22px" }}>
                <div style={{ color: C.win, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                  Strengths
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                  {m.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {m.improvements.length > 0 && (
              <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: 18, padding: "18px 22px" }}>
                <div style={{ color: C.lime, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                  Work on
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                  {m.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* CTA — the growth loop */}
        <div
          style={{
            textAlign: "center",
            borderTop: `1px solid ${C.borderSoft}`,
            paddingTop: 28,
          }}
        >
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 14px" }}>
            This breakdown was generated by AI from match video.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: C.lime,
              color: "#0a0e1a",
              fontWeight: 800,
              fontSize: 15,
              padding: "13px 24px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            Analyze your own match — free →
          </Link>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 18 }}>AI analysis · PickleVision</div>
        </div>
      </div>
    </div>
  );
}
