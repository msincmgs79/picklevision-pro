-- Per-player breakdown (Phase 1). Run once in the Supabase SQL editor.
-- Additive + safe. Existing matches RLS (owner-only) already covers these columns.
--
-- player_breakdown : the analysis result (array of 4 player cards) from
--                    the backend /player-breakdown endpoint.
-- player_names     : { slot -> name } map the user types on each card. Stored
--                    SEPARATELY so re-running the analysis never wipes the names
--                    (the names are passed back into the next run).
alter table matches add column if not exists player_breakdown jsonb;
alter table matches add column if not exists player_names jsonb;
alter table matches add column if not exists player_analyzed_at timestamptz;
