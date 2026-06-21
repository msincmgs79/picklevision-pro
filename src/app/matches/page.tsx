import Link from "next/link";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <Notice
          tone="warn"
          title="Connect the backend to upload matches"
          body="Once Supabase keys are added to the project, sign in and upload your own match footage here. For now, explore the analyzed demo match."
          cta={{ href: "/analysis", label: "Open demo match →" }}
        />
      </Shell>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <Notice
          tone="info"
          title="Sign in to see your matches"
          body="Create an account or sign in to upload footage and build your personal analysis library."
          cta={{ href: "/login", label: "Sign in →" }}
        />
      </Shell>
    );
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <Shell>
      {!matches || matches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 44 }}>🎾</div>
          <div className="section-title" style={{ marginTop: 10 }}>No matches yet</div>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            Upload your first pre-recorded game to get started.
          </p>
          <Link href="/matches/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            ⤴ Upload a match
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 4 }}>
          {matches.map((m: any) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="card" style={{ display: "block", padding: 14 }}>
              <div
                style={{
                  height: 130,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#1d3357,#243b6b)",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 32, opacity: 0.85 }}>▶</div>
                <span className="badge" style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)" }}>
                  {statusLabel(m.status)}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.title}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                {m.team} vs {m.opponent}
              </div>
              <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
                {m.recorded_at || "—"} {m.score ? `· ${m.score}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}

function statusLabel(status: string) {
  if (status === "ready") return "Analyzed";
  if (status === "processing") return "Processing…";
  if (status === "failed") return "Failed";
  return "Preview · analysis pending";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>My Matches</h1>
          <p className="page-sub">Your uploaded games — watch, draw, bookmark and review.</p>
        </div>
        <Link href="/matches/new" className="btn btn-primary">⤴ Upload a match</Link>
      </div>
      <div style={{ marginTop: 24 }}>{children}</div>
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
  cta,
}: {
  tone: "warn" | "info";
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  const c = tone === "warn" ? "var(--average)" : "var(--indigo)";
  return (
    <div className="card" style={{ borderColor: c, background: tone === "warn" ? "rgba(251,191,36,0.07)" : "var(--surface)" }}>
      <div style={{ fontWeight: 700, color: c, fontSize: 15 }}>{title}</div>
      <p className="muted" style={{ fontSize: 14, marginTop: 6, maxWidth: 560 }}>{body}</p>
      <Link href={cta.href} className="btn btn-primary" style={{ marginTop: 14 }}>{cta.label}</Link>
    </div>
  );
}
