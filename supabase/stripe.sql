-- Stripe billing columns + atomic credit top-up.
-- Run once in the Supabase SQL editor (after profiles.sql / credits.sql).

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

-- One Stripe customer per profile (partial unique — nulls allowed).
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Atomic credit increment, called by the Stripe webhook (service role) when a
-- credit pack is purchased. SECURITY DEFINER so it runs regardless of RLS.
create or replace function public.add_credits(uid uuid, n integer)
returns void language sql security definer set search_path = public as $$
  update public.profiles set credits = credits + n where id = uid;
$$;

revoke all on function public.add_credits(uuid, integer) from public;
