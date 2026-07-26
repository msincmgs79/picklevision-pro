-- Public share links for matches.
-- Run once in the Supabase SQL editor. Additive + safe (no data touched).
--
-- How it works: a match gets a random `share_token` the first time its owner
-- turns sharing on (`shared = true`). The public page at /s/<token> is rendered
-- server-side with the SERVICE-ROLE key (bypasses RLS) and selects ONLY a
-- whitelisted summary — never the video path. So NO public RLS policy is added
-- here: rows stay owner-only for the normal (anon/auth) client, and the public
-- page's access is scoped in code to `shared = true` + a matching token.

alter table matches
  add column if not exists share_token text unique,
  add column if not exists shared boolean not null default false;

-- Fast lookups by token for the public page.
create index if not exists matches_share_token_idx
  on matches (share_token)
  where share_token is not null;
