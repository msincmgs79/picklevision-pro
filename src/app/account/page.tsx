"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { getPlanState, PLAN_LABEL, type PlanState } from "../../lib/plan";

type Extra = {
  period_start: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: 14,
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{value}</div>
      {sub && <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const SUB_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
};

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setEmail(auth.user?.email ?? null);
      setMemberSince(auth.user?.created_at ?? null);
      const ps = await getPlanState(supabase);
      setPlan(ps);
      if (auth.user) {
        const { data } = await supabase
          .from("profiles")
          .select("period_start, subscription_status, stripe_customer_id")
          .eq("id", auth.user.id)
          .single();
        setExtra((data as Extra) ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function openPortal() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data.error || "Couldn't open billing portal.");
    } catch {
      setNotice("Network error opening billing portal.");
    }
    setBusy(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";

  const nextReset = () => {
    if (!extra?.period_start) return null;
    const d = new Date(extra.period_start);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  };

  const subLabel = (() => {
    if (extra?.subscription_status) return SUB_LABEL[extra.subscription_status] || extra.subscription_status;
    return plan && plan.plan === "free" ? "No active subscription" : "—";
  })();

  const usagePct = plan && plan.limit ? Math.min(100, Math.round((plan.videosUsed / plan.limit) * 100)) : 0;

  return (
    <div>
      <div className="eyebrow">Account</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>My Account</h1>
      <p className="page-sub">Your profile, plan, monthly usage and credit balance.</p>

      {notice && (
        <div
          className="card"
          style={{ marginTop: 18, borderColor: "rgba(163,230,53,0.4)", background: "rgba(163,230,53,0.07)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13.5 }}>{notice}</span>
            <button className="iconbtn" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading your account…</div>
      ) : !email || !plan ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">You&apos;re not signed in.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
        </div>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 22, alignItems: "start", gap: 16 }}
        >
          {/* Profile */}
          <div className="card">
            <div className="section-title">Profile</div>
            <div style={{ marginTop: 8 }}>
              <Row label="Email" value={email} />
              <Row label="Member since" value={fmtDate(memberSince)} />
              <Row label="Current plan" value={<span className="badge badge-excellent">{PLAN_LABEL[plan.plan]}</span>} />
            </div>
            <button onClick={signOut} className="btn btn-sm" style={{ marginTop: 14 }}>Sign out</button>
          </div>

          {/* Credit balance — prominent */}
          <div className="card" style={{ borderColor: "rgba(163,230,53,0.4)" }}>
            <div className="section-title">Credit balance</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 46, fontWeight: 800, color: "var(--primary)", letterSpacing: "-1.5px", lineHeight: 1 }}>
                {plan.credits}
              </span>
              <span className="muted">credit{plan.credits === 1 ? "" : "s"}</span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
              1 credit = 1 extra analysis — a re-run, or a video beyond your monthly allowance.
            </p>
            <Link href="/upgrade" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Buy credits</Link>
          </div>

          {/* Plan & usage — full width */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="section-title">Plan &amp; usage</div>
              <div style={{ display: "flex", gap: 8 }}>
                {extra?.stripe_customer_id && (
                  <button className="btn btn-sm" onClick={openPortal} disabled={busy}>
                    {busy ? "Opening…" : "Manage billing"}
                  </button>
                )}
                <Link href="/upgrade" className="btn btn-primary btn-sm">
                  {plan.plan === "ultra" ? "Change plan" : "Upgrade"}
                </Link>
              </div>
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginTop: 16, gap: 12 }}
            >
              <Stat label="Current plan" value={PLAN_LABEL[plan.plan]} />
              <Stat label="Videos / month" value={String(plan.limit)} />
              <Stat label="Total remaining" value={String(plan.remaining)} sub="monthly + credits" />
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span className="muted">This month&apos;s videos</span>
                <span style={{ fontWeight: 700 }}>{plan.videosUsed} / {plan.limit} used</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${usagePct}%` }} />
              </div>
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 18, gap: 12 }}
            >
              <Row label="Subscription" value={subLabel} />
              <Row label={plan.plan === "free" ? "Usage resets" : "Renews / resets"} value={fmtDate(nextReset())} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
