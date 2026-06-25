-- PickleVision billing schema: per-user plan, top-up credits, monthly usage.
-- Run once in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium','ultra')),
  credits integer not null default 0,
  videos_used integer not null default 0,
  period_start timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may READ their own profile. plan/credits are never written by the
-- client — only by consume_video() (security definer) or the future payment
-- webhook (service role). So there is deliberately no client UPDATE policy.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing users.
insert into public.profiles (id)
select id from auth.users on conflict (id) do nothing;

-- Atomically spend one video: monthly allowance first, then a top-up credit.
-- Returns 'ok' or 'none'. Enforced server-side so limits can't be bypassed.
create or replace function public.consume_video()
returns text language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  lim integer;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if not found then
    return 'none';
  end if;

  -- Roll the monthly period over if it's older than a month.
  if p.period_start < now() - interval '1 month' then
    update public.profiles set videos_used = 0, period_start = now() where id = p.id;
    p.videos_used := 0;
  end if;

  lim := case p.plan when 'ultra' then 15 when 'premium' then 5 else 1 end;

  if p.videos_used < lim then
    update public.profiles set videos_used = videos_used + 1 where id = p.id;
    return 'ok';
  elsif p.credits > 0 then
    update public.profiles set credits = credits - 1 where id = p.id;
    return 'ok';
  else
    return 'none';
  end if;
end; $$;

grant execute on function public.consume_video() to authenticated;
