-- Drill library + assignments — Phase 3c.
-- Run once in the Supabase SQL editor. Additive + safe.
--
-- A coach builds a reusable `drills` library and assigns drills to roster
-- students. Each assignment snapshots the drill's title/description, so a linked
-- student reads only their own `drill_assignments` (never the coach's library).

create table if not exists drills (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  video_url text,
  created_at timestamptz not null default now()
);
create index if not exists drills_coach_idx on drills (coach_id);

alter table drills enable row level security;
drop policy if exists "coach manages own drills" on drills;
create policy "coach manages own drills" on drills
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create table if not exists drill_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  drill_id uuid references drills (id) on delete set null,
  title text not null,          -- snapshot of the drill at assign time
  description text,
  note text,                    -- coach's note for this student
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists drill_assignments_student_idx on drill_assignments (student_id);
create index if not exists drill_assignments_coach_idx on drill_assignments (coach_id);

alter table drill_assignments enable row level security;

-- Coach fully manages assignments they created.
drop policy if exists "coach manages own assignments" on drill_assignments;
create policy "coach manages own assignments" on drill_assignments
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- A linked student can read the assignments for their own roster entry…
drop policy if exists "student reads own assignments" on drill_assignments;
create policy "student reads own assignments" on drill_assignments
  for select using (
    exists (
      select 1 from students s
      where s.id = drill_assignments.student_id and s.linked_user_id = auth.uid()
    )
  );

-- …and mark them done.
drop policy if exists "student updates own assignment" on drill_assignments;
create policy "student updates own assignment" on drill_assignments
  for update using (
    exists (
      select 1 from students s
      where s.id = drill_assignments.student_id and s.linked_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from students s
      where s.id = drill_assignments.student_id and s.linked_user_id = auth.uid()
    )
  );
