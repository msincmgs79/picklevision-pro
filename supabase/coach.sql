-- Coach & Club accounts — Phase 3a schema.
-- Run once in the Supabase SQL editor. Additive + safe (no existing data touched).
--
-- A "student" is a roster entry owned by a coach. It's either:
--   * managed  — a coach-owned profile, no login (coach films & uploads for them), or
--   * invited  — an invite sent to a real user's email (pending), or
--   * active   — a real PickleVision user who accepted (linked_user_id set).
-- Phase 3a uses `managed`; the invite/linked columns are here so Phase 3b (invites
-- + linked real users) needs no re-migration.

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  notes text,
  linked_user_id uuid references auth.users (id) on delete set null,
  invite_token text unique,
  status text not null default 'managed' check (status in ('managed', 'invited', 'active')),
  created_at timestamptz not null default now()
);

create index if not exists students_coach_idx on students (coach_id);
create index if not exists students_linked_user_idx
  on students (linked_user_id) where linked_user_id is not null;

alter table students enable row level security;

-- Coach fully manages their own roster (select/insert/update/delete).
drop policy if exists "coach manages own roster" on students;
create policy "coach manages own roster" on students
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- A linked/invited real user can SEE the roster row that points to them
-- (to view they're on a roster / accept an invite in Phase 3b).
drop policy if exists "linked user sees own roster row" on students;
create policy "linked user sees own roster row" on students
  for select
  using (linked_user_id = auth.uid());

-- Tag a match to a roster student (coach uploads under their own account and
-- assigns it to a student). Existing RLS on matches already scopes this to owners.
alter table matches
  add column if not exists student_id uuid references students (id) on delete set null;

create index if not exists matches_student_idx
  on matches (student_id) where student_id is not null;
