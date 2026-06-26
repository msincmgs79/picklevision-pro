# PickleVision — Outstanding work & timeline

_Last updated: 2026-06-26._
Legend: **[Owner]** = you do it (dashboards / accounts / payments) · **[Build]** = code work (me) · **[Both]** = you set up an account/keys, I wire it.

---

## ✅ Recently shipped (context — already off the list)
Cloudflare **R2 storage** (multipart uploads, lifts the 50 MB cap) · **in/out** cleanup (landing-based + clean maps) · **career rating + trend** chart · **share card** · **win/loss** tracking · **player court-coverage** (Phase A) · **re-run credit flow** (first run included, re-runs cost a credit).

---

## 🔴 Time-sensitive — do soon
| Item | Who | Notes |
|---|---|---|
| **Railway paid plan** | [Owner] | Trial **~23 days / $4.67 left** (as of 2026-06-26). When it runs out, the AI-analysis backend (ball detection, tracking, players, shot breakdown) **goes offline**. Put it on the Hobby plan (~$5/mo) before then. |

---

## 🟠 Launch prep — the "go-live" batch (do together when you launch)

**Activation (quick, in the Supabase / Vercel dashboards):**
| Item | Who | Notes |
|---|---|---|
| Run `supabase/profiles.sql` | [Owner] | Turns on real plans + monthly video limits + `consume_video`. |
| Run `supabase/credits.sql` `spend_credit` RPC | [Owner] | Enables the re-run credit deduction (bundle with profiles.sql). |
| Run `supabase/push_subscriptions.sql` + add VAPID env in Vercel | [Owner] | Switches on "analysis ready" push notifications. |
| Flip `TESTING_FORCE_ULTRA = false` in `src/lib/plan.ts` | [Build] | Stops everyone defaulting to Ultra; real tiers apply. |

**Payments:**
| Item | Who | Notes |
|---|---|---|
| **Stripe** checkout + webhooks | [Both] | You create the Stripe account/keys; I wire checkout into the existing plan/credit model (upgrade page + credit packs are already built, currently stubbed "payments launch soon"). |

**R2 housekeeping:**
| Item | Who | Notes |
|---|---|---|
| Re-upload or delete old test videos | [Owner] | Videos uploaded before the R2 switch live on Supabase and won't play under R2. |
| Revoke the old broken R2 token | [Owner] | Cloudflare → R2 → API tokens: delete "R2 Account Token"; keep **picklevision-app-2**. |

---

## 🟡 At volume — when usage justifies it
| Item | Who | Notes |
|---|---|---|
| **Self-host detection on Modal** | [Both] | Plan: `docs/self-host-plan.md`. Drops ~$1.25 → ~$0.02 per video. **Not urgent** — margins already work on hosted (~62% Ultra, ~80% re-runs). Trigger ≈ a few hundred analyses/month. You create the Modal account; I build + wire it (Roboflow kept as fallback). |

---

## 🔵 Feature backlog — post-launch (gated on CV/ML or camera fidelity)

**Tier 2 — deeper analysis (the hard CV/ML; best bundled with self-hosting):**
| Item | Who | Gated on |
|---|---|---|
| True **per-shot in/out** line-calling | [Build] | Higher-fps tracking + real bounce detection (today's in/out is an approximate per-rally read). |
| **Serve / shot speeds** | [Build] | Accurate calibration + higher-fps tracking. |
| **Shot-type classification** (serve/dink/drop/drive) | [Build] | A trained ML model. |
| **Player tracking Phase B** (per-player IDs, distance, speed) | [Build] | ByteTrack tracking at higher fps — bundle with self-host. |

**Tier 3 — engagement:**
| Item | Who | Gated on |
|---|---|---|
| **Public share link** (live, no-login match page) | [Both] | A share token + public page + a server (service-role) key in Vercel; decide what's exposed (no raw video). |
| **Automatic score detection** | [Build] | Hard — scoreboard OCR / rally counting; lower confidence. |

---

## Notes & dependencies
- **Court calibration:** in/out Phase 1 is done; the full-court reshoot is uploaded and calibrated (test video 02). Phase 2 line-calling lives in Tier 2 above.
- **Cost model is healthy as-is** at the real Roboflow rate (~$0.0008/inference); the credit flow protects re-run margin. See `docs/self-host-plan.md` and the billing notes.
- **Nothing here blocks current testing** — the app is fully usable now; this list is about launch-readiness and future depth.

---

### Suggested order
1. **Railway paid plan** (time-sensitive).
2. **Launch batch** together: profiles + credits + push SQL → flip Ultra flag → Stripe → R2 cleanup.
3. **Self-host on Modal** once you have steady paying volume.
4. **Tier 2 / Tier 3** features as the product grows.
