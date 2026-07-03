-- Tier restructure (2026-07): add the Premium Plus tier and reprice.
-- Free = 1 video/mo, Premium = 3, Premium Plus = 7, Ultra = 15.
-- Run once in the Supabase SQL editor.

-- 1) Allow the new 'premiumplus' plan value.
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free','premium','premiumplus','ultra'));

-- 2) Update the monthly-allowance enforcement to the new per-plan limits.
create or replace function public.consume_video()
returns text language plpgsql security definer set search_path = public as $BODY$
declare
  p public.profiles%rowtype;
  lim integer;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if not found then return 'none'; end if;

  if p.period_start < now() - interval '1 month' then
    update public.profiles set videos_used = 0, period_start = now() where id = p.id;
    p.videos_used := 0;
  end if;

  lim := case p.plan
    when 'ultra' then 15
    when 'premiumplus' then 7
    when 'premium' then 3
    else 1
  end;

  if p.videos_used < lim then
    update public.profiles set videos_used = videos_used + 1 where id = p.id;
    return 'ok';
  elsif p.credits > 0 then
    update public.profiles set credits = credits - 1 where id = p.id;
    return 'ok';
  else
    return 'none';
  end if;
end; $BODY$;

grant execute on function public.consume_video() to authenticated;
