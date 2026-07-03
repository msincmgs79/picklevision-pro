"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { getPlanState, PLAN_LABEL, type PlanState, type Plan } from "../../lib/plan";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    per: "forever",
    features: [
      "1 video / month",
      "1 PDF coaching report",
      "Keep your latest 2 videos",
      "AI shot breakdown & ball map",
      "Buy credits for more videos",
    ],
    highlight: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$12.99",
    per: "/ month",
    features: [
      "3 videos / month",
      "3 PDF coaching reports",
      "25 GB storage · 3-month history",
      "Everything in Free",
      "Discounted top-up credits",
    ],
    highlight: true,
  },
  {
    id: "premiumplus",
    name: "Premium Plus",
    price: "$24.99",
    per: "/ month",
    features: [
      "7 videos / month",
      "7 PDF coaching reports",
      "50 GB storage · 6-month history",
      "Everything in Premium",
      "Better top-up credit rates",
    ],
    highlight: false,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$49.99",
    per: "/ month",
    features: [
      "15 videos / month",
      "15 PDF coaching reports",
      "250 GB storage · 12-month history",
      "Everything in Premium Plus",
      "Best top-up credit rates",
    ],
    highlight: false,
  },
];

const packs = [
  { credits: 3, price: "$11.99", per: "$4.00 each" },
  { credits: 10, price: "$34.99", per: "$3.50 each" },
  { credits: 25, price: "$79.99", per: "$3.20 each" },
];

export default function UpgradePage() {
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const currentPlan: Plan = planState?.plan ?? "free";

  function refreshPlan() {
    if (!isSupabaseConfigured) return;
    getPlanState(createClient()).then(setPlanState);
  }

  useEffect(() => {
    refreshPlan();
    // Returning from Stripe Checkout — show the outcome and re-check the plan
    // (the webhook fulfils asynchronously, so poll a couple of times).
    const outcome = new URLSearchParams(window.location.search).get("checkout");
    if (outcome === "success") {
      setNotice("Payment received 🎉 Your plan/credits will update within a few seconds.");
      setTimeout(refreshPlan, 3000);
      setTimeout(refreshPlan, 8000);
      window.history.replaceState({}, "", "/upgrade");
    } else if (outcome === "cancel") {
      setNotice("Checkout canceled — no charge was made.");
      window.history.replaceState({}, "", "/upgrade");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(key: string, payload: Record<string, unknown>) {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNotice(data.error || "Couldn't start checkout. Please try again.");
    } catch {
      setNotice("Network error starting checkout.");
    }
    setBusy(null);
  }

  async function openPortal() {
    setBusy("portal");
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
    setBusy(null);
  }

  return (
    <div>
      <div className="eyebrow">Plans</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Upgrade your plan</h1>
      <p className="page-sub">
        One video = one full AI analysis (shot breakdown + ball map). Do more each month, or top up with credits anytime.
      </p>
      {planState && (
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          You&apos;re on the <b style={{ color: "var(--primary)" }}>{PLAN_LABEL[planState.plan]}</b> plan · {planState.remaining} video{planState.remaining === 1 ? "" : "s"} left this month{planState.credits > 0 ? ` (incl. ${planState.credits} credits)` : ""}.
        </div>
      )}

      {notice && (
        <div className="card" style={{ marginTop: 18, borderColor: "rgba(163,230,53,0.4)", background: "rgba(163,230,53,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13.5 }}>{notice}</span>
            <button className="iconbtn" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", marginTop: 22, alignItems: "stretch" }}>
        {tiers.map((t) => {
          const isCurrent = t.id === currentPlan;
          return (
            <div
              key={t.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                borderColor: t.highlight ? "var(--primary)" : "var(--border)",
                boxShadow: t.highlight ? "0 0 0 1px var(--primary) inset, 0 10px 30px rgba(0,0,0,0.3)" : undefined,
                position: "relative",
              }}
            >
              {t.highlight && (
                <span className="badge badge-excellent" style={{ position: "absolute", top: -11, left: 18, fontSize: 11, background: "var(--primary)", color: "#0a1300", borderColor: "var(--primary)" }}>
                  Most popular
                </span>
              )}
              <div className="section-title">{t.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px" }}>{t.price}</span>
                <span className="muted" style={{ fontSize: 13 }}>{t.per}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5 }}>
                    <span style={{ color: "var(--excellent)", fontWeight: 800 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn" disabled style={{ opacity: 0.6, cursor: "default" }}>Current plan</button>
              ) : currentPlan !== "free" ? (
                // Already subscribed — switch/cancel via the Stripe billing portal
                // (avoids creating a second subscription).
                <button className="btn" onClick={openPortal} disabled={busy === "portal"}>
                  {busy === "portal" ? "Opening…" : "Manage plan"}
                </button>
              ) : t.id === "free" ? (
                <button className="btn" disabled style={{ opacity: 0.6, cursor: "default" }}>Your plan</button>
              ) : (
                <button
                  className={"btn" + (t.highlight ? " btn-primary" : "")}
                  onClick={() => startCheckout(`tier-${t.id}`, { kind: "subscription", plan: t.id })}
                  disabled={busy === `tier-${t.id}`}
                >
                  {busy === `tier-${t.id}` ? "Starting…" : `Upgrade to ${t.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="section-title">Top-up credits</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Out of monthly videos? Buy credits — 1 credit = 1 extra video analysis. Premium &amp; Ultra members get discounted rates automatically.
        </p>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 16 }}>
          {packs.map((p) => (
            <div key={p.credits} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{p.credits} credits</div>
              <div className="muted" style={{ fontSize: 13 }}>{p.price} · {p.per}</div>
              <button
                className="btn btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => startCheckout(`pack-${p.credits}`, { kind: "credits", credits: p.credits })}
                disabled={busy === `pack-${p.credits}`}
              >
                {busy === `pack-${p.credits}` ? "Starting…" : `Buy ${p.credits}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="dim" style={{ fontSize: 11.5, marginTop: 16, lineHeight: 1.6, maxWidth: 640 }}>
        Videos are capped at 1 GB each. Storage allowances apply per plan — when you reach your limit you can free up space by deleting older matches, or upgrade. Prices in USD.
      </p>
    </div>
  );
}
