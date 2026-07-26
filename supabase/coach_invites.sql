-- Coach invites — Phase 3b.
-- Run once in the Supabase SQL editor. Additive + safe.
--
-- Lets a coach READ the matches owned by a student who has accepted an invite
-- (students.status = 'active', linked_user_id = that student's real account).
-- Postgres OR-combines this with the existing "own matches - select" policy, so
-- a coach sees their own matches plus their active linked students' own uploads.
-- The student's own owner-only policies are unchanged; nothing else can read them.

drop policy if exists "coach reads linked student matches" on public.matches;
create policy "coach reads linked student matches" on public.matches
  for select
  using (
    exists (
      select 1
      from public.students s
      where s.coach_id = auth.uid()
        and s.status = 'active'
        and s.linked_user_id = public.matches.user_id
    )
  );
