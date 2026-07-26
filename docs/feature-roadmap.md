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

### Phase 3 — Coach & Club accounts _(hybrid: coach-managed students + invited real users)_

**✅ 3a — Roster + managed students + match tagging** _(built 2026-07-21 — needs `coach.sql` + push)_
- [x] `supabase/coach.sql` — `students` table (managed/invited/active; invite+linked-user cols
  included so 3b needs no re-migration) + RLS (coach CRUD own roster; linked user sees own row);
  `matches.student_id` tag column. **You run it.**
- [x] `src/lib/coach.ts` — `Student` type + pure per-student `rollupFromRows` (recency-weighted).
- [x] `src/app/coach/page.tsx` — dashboard: add students, roster cards with rating/record.
- [x] `src/app/coach/[studentId]/page.tsx` — per-student rating, skill breakdown, match list.
- [x] `MatchPlayer` "Assign to student" dropdown (shown only if you have a roster) +
  "Coach dashboard" in the sidebar. All CRUD is client-side via RLS (no new API routes).
- Verified: `tsc` + `next build` clean; prod `/coach` + `/coach/[id]` render (200).

**✅ 3b — Invites + linked real users** _(built + LIVE 2026-07-26)_
- [x] `supabase/coach_invites.sql` — matches SELECT policy so a coach reads an active linked
  student's own matches (OR-combined with the owner-only policy). **Ran on prod.**
- [x] `/api/coach/accept` — GET invite validity; POST links the signed-in user (service role).
- [x] `/coach/join/[token]` — accept page (signed-out / valid / already-used / accepted).
- [x] Per-student page: "Create invite link" + copy; merges the linked user's own matches with
  coach-tagged ones. Dashboard: LINKED/INVITED badges + counts linked students' own matches.

**✅ 3c — Drill library + assignments** _(built + LIVE 2026-07-26)_
- [x] `supabase/drills.sql` — `drills` (coach library) + `drill_assignments` (snapshotted
  title/description; RLS so a linked student reads + ticks off only their own). **Ran on prod.**
- [x] `/coach/drills` library (create/list/delete), assign-a-drill on the per-student page,
  `/drills` student view (mark done), sidebar Drill library + My Drills links.

**Coach pricing tier** — [Owner]. Plumbed tier-agnostic; anyone signed in can use /coach for now.

### Phase 4 — Deeper analytics & community
- **✅ 4a — Trends & Matchups** _(built + LIVE 2026-07-26, `67c96f3`)_ — `/trends`: record/win%,
  streak, recent form, rating momentum, breakdown by opponent + by team. Pure frontend over
  existing matches; no migration.
- **4b — Leaderboard (opt-in)** _(needs a decision)_ — ranking players by AI rating. Requires an
  opt-in flag + a stored per-user rating + display name (privacy: opt-in only). [Owner] decision:
  should it exist, and public or friends-only?
- **4c — DUPR integration** _(gated)_ — [Owner] needs DUPR API access first.

### Phase 5 — Auto highlight reels
- **✅ 5a — Highlight reel playback** _(built + LIVE 2026-07-26, `e41cf58`)_ — on the Rallies tab,
  "🎬 Play highlight reel" (top moments) + "▶ Play all rallies" (skips dead time), hands-free
  sequential playback over the existing video with Stop + a moment counter. Reuses `analyzeRallies`.
  Needs a full-video track first (Trajectories → Track full video).
- **5b — True clipped video reels** _(later)_ — downloadable/shareable clipped reels; needs
  backend ffmpeg (bundle with Track B backend work).

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
