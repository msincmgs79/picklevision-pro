import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { loadSharedReel } from "../../../lib/reelShare";

export const dynamic = "force-dynamic";

// Dedupe the DB read across generateMetadata + the page render (same request).
const getReel = cache((token: string) => loadSharedReel(token));

const C = {
  panel: "rgba(255,255,255,0.04)",
  border: "rgba(163,230,53,0.22)",
  borderSoft: "rgba(255,255,255,0.08)",
  lime: "#a3e635",
  white: "#f8fafc",
  muted: "#94a3b8",
};

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const r = await getReel(params.token);
  if (!r) return { title: "Shared reel", robots: { index: false, follow: false } };
  const title = `${r.title} — highlight reel`;
  const description = `${r.moments ? `${r.moments} top moments` : "Highlights"}${r.seconds ? ` · ${Math.round(r.seconds)}s` : ""} · PickleVision AI.`;
  const url = `/r/${params.token}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: {
      type: "video.other",
      title,
      description,
      url,
      images: [{ url: "/logo.png", width: 512, height: 512, alt: "PickleVision" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/logo.png"] },
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
        <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>This reel link isn&rsquo;t available</h1>
        <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.5, margin: "0 0 28px" }}>
          The link may have been removed, or it has expired.
        </p>
        <Link
          href="/"
          style={{ display: "inline-block", background: C.lime, color: "#0a0e1a", fontWeight: 800, padding: "13px 22px", borderRadius: 12, textDecoration: "none" }}
        >
          Analyze your own match — free →
        </Link>
      </div>
    </div>
  );
}

export default async function SharedReelPage({ params }: { params: { token: string } }) {
  const r = await getReel(params.token);
  if (!r) return <Unavailable />;

  return (
    <div style={{ color: C.white }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <Brand />
          <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Highlight reel
          </span>
        </div>

        <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: "0 0 6px", fontWeight: 800 }}>{r.title}</h1>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
          {r.moments ? `${r.moments} top moment${r.moments === 1 ? "" : "s"}` : "Highlights"}
          {r.seconds ? ` · ${Math.round(r.seconds)}s` : ""}
        </div>

        <div style={{ background: "#000", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={r.videoUrl} controls playsInline preload="metadata" style={{ width: "100%", display: "block", background: "#000" }} />
        </div>

        <div style={{ textAlign: "center", borderTop: `1px solid ${C.borderSoft}`, paddingTop: 26 }}>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 14px" }}>
            These highlights were auto-detected from match video by AI.
          </p>
          <Link
            href="/"
            style={{ display: "inline-block", background: C.lime, color: "#0a0e1a", fontWeight: 800, fontSize: 15, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}
          >
            Analyze your own match — free →
          </Link>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 18 }}>AI analysis · PickleVision</div>
        </div>
      </div>
    </div>
  );
}
