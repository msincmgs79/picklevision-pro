-- Win/loss tracking: one optional column on matches.
-- Run once in the Supabase SQL editor. Safe + additive (no data touched);
-- existing RLS on `matches` already covers it (users own their rows).
alter table matches
  add column if not exists result text
  check (result in ('win', 'loss'));
