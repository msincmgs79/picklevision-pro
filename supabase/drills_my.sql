-- My Drills hub — extends drill_assignments so drills can belong DIRECTLY to a
-- player (user_id), not only to a coach's roster student. This powers:
--   • AI-generated drills from a player's own game breakdown  (source = 'ai')
--   • drills a player adds for themselves                     (source = 'self')
--   • drills a coach assigns                                  (source = 'coach', existing flow)
-- Run once in the Supabase SQL editor. Additive + safe (idempotent).

alter table drill_assignments add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table drill_assignments add column if not exists source text not null default 'coach';
alter table drill_assignments add column if not exists match_id uuid references matches (id) on delete set null;

-- Self/AI drills have no coach or roster student, so those must be optional now.
alter table drill_assignments alter column coach_id drop not null;
alter table drill_assignments alter column student_id drop not null;

create index if not exists drill_assignments_user_idx on drill_assignments (user_id);

-- A player fully manages the drills that belong to them (self-added + AI-generated
-- + anything assigned directly to their user_id): read, insert, mark done, delete.
drop policy if exists "user manages own drills" on drill_assignments;
create policy "user manages own drills" on drill_assignments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- (The existing "coach manages own assignments" and "student reads/updates own
--  assignments" policies remain — coach-assigned roster drills are unaffected.)
