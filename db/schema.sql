-- PickleVision — run this once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)

-- ─────────────────────────────────────────────────────────────
-- Matches
-- ─────────────────────────────────────────────────────────────
create table if not exists public.matches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title            text not null default 'Untitled match',
  team             text default 'My Team',
  opponent         text default 'Opponent',
  score            text,
  result           text,
  recorded_at      date default now(),
  video_path       text,                 -- path in the match-videos storage bucket
  duration_seconds integer,
  status           text not null default 'uploaded',  -- uploaded | processing | ready | failed
  created_at       timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "own matches - select" on public.matches
  for select using (auth.uid() = user_id);
create policy "own matches - insert" on public.matches
  for insert with check (auth.uid() = user_id);
create policy "own matches - update" on public.matches
  for update using (auth.uid() = user_id);
create policy "own matches - delete" on public.matches
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Bookmarks (saved moments on a match)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  t          numeric not null,          -- seconds into the video
  label      text,
  created_at timestamptz not null default now()
);

alter table public.bookmarks enable row level security;

create policy "own bookmarks - all" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for uploaded videos (private)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('match-videos', 'match-videos', false)
on conflict (id) do nothing;

-- Each user can only touch files under a folder named with their own user id,
-- e.g.  <user_id>/<match_id>.webm
create policy "own videos - select" on storage.objects
  for select using (
    bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own videos - insert" on storage.objects
  for insert with check (
    bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own videos - delete" on storage.objects
  for delete using (
    bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text
  );
