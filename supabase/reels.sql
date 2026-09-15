-- Shareable highlight reels (Phase 5b, option B). A reel is a stitched .mp4
-- (built by the backend /reel endpoint) that the player uploads to storage and
-- shares via an unguessable /r/<token> link. The public page reads a single row
-- through the service role — no public SELECT policy is needed or wanted.
-- Run once in the Supabase SQL editor. Additive + safe (idempotent).

create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid references matches (id) on delete set null,
  share_token text not null unique,
  storage_key text not null,     -- R2 / Supabase key of the reel mp4 (never exposed to clients)
  title text,
  seconds numeric,
  moments int,
  created_at timestamptz not null default now()
);
create index if not exists reels_user_idx on reels (user_id);
create index if not exists reels_token_idx on reels (share_token);

alter table reels enable row level security;

-- A player fully manages their own reels (create the share row, list, delete).
drop policy if exists "user manages own reels" on reels;
create policy "user manages own reels" on reels
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
