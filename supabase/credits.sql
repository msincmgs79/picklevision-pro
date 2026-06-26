-- Credit deduction for re-runs / extra analyses.
-- The FIRST run of each analysis (ball detection, shot breakdown, ball track,
-- player coverage) is included with the upload; re-runs spend a top-up credit.

-- 1) Per-match record of which analyses have used their included (first) run.
--    Safe + additive — run any time. (App reads/writes matches.analysis_runs.)
alter table matches
  add column if not exists analysis_runs jsonb not null default '{}'::jsonb;

-- 2) spend_credit(): atomically spend one credit for the signed-in user.
--    Returns 'ok' if a credit was deducted, 'denied' if the balance is 0.
--    Requires the profiles table (see profiles.sql) — run that at launch too.
--    Until this RPC exists, the app fails OPEN (re-runs aren't blocked) so
--    testing isn't hampered before billing is live.
create or replace function spend_credit()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  update profiles
    set credits = credits - 1
    where id = auth.uid() and credits > 0
    returning credits into remaining;
  if remaining is null then
    return 'denied';
  end if;
  return 'ok';
end;
$$;

revoke all on function spend_credit() from public;
grant execute on function spend_credit() to authenticated;
