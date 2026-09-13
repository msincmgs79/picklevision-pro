-- Opt-in leaderboard — Phase 4b.
-- Run once in the Supabase SQL editor. Additive + safe.
--
-- A DEDICATED public table holding ONLY leaderboard-safe fields (chosen display
-- name, AI rating, record). Opting in never exposes anything from `profiles`
-- (plan, credits, Stripe id stay private). A row exists only for users who
-- explicitly opt in; deleting the row = opting out.

create table if not exists leaderboard (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  rating numeric,
  wins int not null default 0,
  losses int not null default 0,
  matches int not null default 0,
  updated_at timestamptz not null default now()
);

alter table leaderboard enable row level security;

-- Public ranking: anyone (including signed-out visitors) can read it.
drop policy if exists "leaderboard public read" on leaderboard;
create policy "leaderboard public read" on leaderboard
  for select using (true);

-- Each user manages only their own row (opt in / update rating / opt out).
drop policy if exists "user manages own leaderboard row" on leaderboard;
create policy "user manages own leaderboard row" on leaderboard
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
