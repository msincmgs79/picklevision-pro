# PickleVision — World-class feature roadmap

_Last updated: 2026-07-21._
Legend: **[Owner]** = you (dashboards / keys / payments) · **[Build]** = code (me) · **[Both]** = you add an account/key, I wire it.

This is the **feature-vision** roadmap (where the product goes). For launch/ops tasks
(Stripe live mode, flip the Ultra flag, R2 cleanup) see [`roadmap.md`](./roadmap.md).

---

## The two tracks

**Track A — App layer.** Everything I can build and ship end-to-end from this repo
through the normal `git push → Vercel` flow. No new paid infra unless a phase says so.
We do these **one at a time, top to bottom**.

**Track B — Core CV / ML.** The deep vision upgrades. Gated on the backend (FastAPI on
Railway) + model training (the parked Roboflow labelling work). Speced here so it's
ready to build when that work resumes — runs in parallel, on its own clock.

---

## The 6 pillars (the vision, one line each)
1. **Trustworthy core analysis** — auto line-calling, shot-type classification, ball/serve speed, per-player tracking, auto scoring. _(Track B)_
2. **Shareable moments** — public share pages + auto highlight reels. _(Track A)_
3. **Coach & club platform** — org accounts, students, drill library, in-app AI coach. _(Track A)_
4. **Live / real-time analysis** — courtside feedback as you play. _(Track B, hardest)_
5. **Frictionless capture** — auto court calibration, native apps. _(Both)_
6. **Community** — doubles analytics, leaderboards, DUPR integration. _(Track A)_

---

## Track A — build sequence (doing now, 1 by 1)

### ✅ Phase 1 — Public share pages  _(built 2026-07-21 — needs `share.sql` + push to go live)_
Turns the client-side share **card** into a live, no-login share **link**:
`/s/<token>` → a branded, OG-rich match summary anyone can open.
Every shared match becomes a marketing surface. **No raw video is ever exposed.**
- [x] `share_token` + `shared` columns on `matches` (`supabase/share.sql` — **you run it**).
- [x] `/api/share` — owner enables/disables a public link (RLS-checked ownership, service-role write).
- [x] `src/app/s/[token]/page.tsx` — public server page, per-match OG/Twitter meta, `noindex` by default.
- [x] "🔗 Share link" panel on the match page (create link, copy, open, stop sharing).
- Reuses the **service-role key already in Vercel** (from Stripe) — nothing new for you.
- Verified: `tsc` + `next build` clean; prod server renders `/s/<token>` (200) and the API guard fires.

### ✅ Phase 2 — AI Coach Chat  _(built 2026-07-21 — needs `GEMINI_API_KEY` in Vercel + push)_
Per-match "🎓 AI Coach" — a chat grounded in that match's real analysis data
(ratings, shots, kitchen control, strengths/improvements) that answers questions
and prescribes drills. Streams the reply live; never claims official DUPR.
**Uses Gemini (`gemini-2.5-flash`) — the same provider/key as the AI breakdown**
(one provider, one bill, far cheaper than a second AI). _(Originally prototyped on
Claude, then switched to Gemini at the owner's call.)_
- [x] `src/lib/gemini.ts` — `geminiConfigured` guard + `COACH_MODEL` constant (one-line to tune).
- [x] `src/app/api/coach/route.ts` — streaming Gemini SSE, data-grounded system prompt (no
  hallucinated stats), RLS ownership check, `maxOutputTokens` capped, thinking off (cheap),
  graceful "not switched on" 503.
- [x] `src/components/CoachChat.tsx` + "🎓 AI Coach" panel in `MatchPlayer` (starter questions,
  live-streamed replies, needs shot analysis first).
- **Metering:** included per analyzed match — first message unlocks it (recorded as `coach`
  in the run ledger), then chat freely. Cost bounded by `maxOutputTokens` + Gemini Flash pricing.
  (Easy to switch to per-message/session credits later if usage warrants.)
- **To go live:** [Both] ensure `GEMINI_API_KEY` is set in Vercel (you already use it — same key
  as the breakdown; it may already be there), then push. No new provider, no new bill.
- Verified: `tsc` + `next build` clean; prod route returns the 503 config guard correctly.

### Phase 3 — Coach & Club accounts
A coach invites students, sees their matches + rating trends, assigns drills.
- [Build] `orgs` / `memberships` schema + RLS; invite flow.
- [Build] Coach dashboard (roster, per-student progress); drill library content model.
- New tier surface ("Coach" plan) — pricing decision is [Owner].

### Phase 4 — Deeper analytics & community
Uses data we already have; no new infra.
- [Build] Progress page (rating over time, per-skill deltas, streaks).
- [Build] Leaderboards (opt-in) + doubles/partner analytics.
- [Both] DUPR integration — gated on DUPR API access [Owner].

### Phase 5 — Auto highlight reels
- [Build] **Now:** auto chapter-markers + jump-to "moments" on the review player (client-side).
- [Build] **Later:** true clipped video reels — needs backend ffmpeg (bundle with Track B backend work).

---

## Track B — Core CV / ML (parallel, gated)
| Feature | Gate |
|---|---|
| True per-shot **in/out** line-calling | higher-fps tracking + real bounce detection |
| **Shot-type** classification (serve/dink/drop/drive) | a trained ML model (Roboflow labelling) |
| **Serve / shot speeds** | accurate calibration + higher-fps tracking |
| **Per-player tracking** (IDs, distance, speed) | ByteTrack at higher fps — bundle w/ self-host |
| **Automatic score detection** | scoreboard OCR / rally counting (lower confidence) |
| **Live / real-time** analysis | on-device or streaming inference — biggest lift |

These are best bundled with **self-hosting detection on Modal** (`docs/self-host-plan.md`),
which also cuts per-video cost ~60×. Trigger: steady paid volume.

---

## Suggested order (Track A)
**Phase 1 (share pages) → Phase 2 (AI coach chat) → Phase 3 (coach/club) → Phase 4 (analytics) → Phase 5 (reels).**
Each ships independently; nothing here blocks the others or current testing.
