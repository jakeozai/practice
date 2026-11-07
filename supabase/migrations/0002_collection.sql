-- Collection from many public job boards (docs/supply-check-2026-11-07.md).
-- 1) Recruitee as a source kind  2) one row per (kind, endpoint)
-- 3) seed sources (mirrors lib/sources/seeds.ts)  4) query for postings that need processing

alter table sources drop constraint sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('greenhouse','lever','ashby','recruitee','page','manual'));

-- NULL endpoints (manual) stay allowed more than once.
create unique index sources_kind_endpoint_key on sources (kind, endpoint);

insert into sources (name, kind, endpoint, trusted) values
  ('Invisible (Freelance AI Trainer)', 'greenhouse', 'agency', true),
  ('Welo Data', 'lever', 'weloglobal', true),
  ('RWS TrainAI', 'lever', 'rws', true),
  ('TransPerfect / DataForce', 'recruitee', 'transperfect', true),
  ('Appen', 'lever', 'appen', true),
  ('xAI', 'greenhouse', 'xai', true),
  ('Toloka', 'greenhouse', 'toloka', true),
  ('Remotasks', 'greenhouse', 'remotasks', true),
  ('Scale AI', 'greenhouse', 'scaleai', true),
  ('Turing', 'greenhouse', 'turing', true),
  ('Labelbox (Alignerr)', 'greenhouse', 'labelbox', true),
  ('Prolific', 'greenhouse', 'prolific', true),
  ('Snorkel AI', 'greenhouse', 'snorkelai', true),
  ('Mercor', 'ashby', 'mercor', true),
  ('Handshake', 'ashby', 'handshake', true)
on conflict (kind, endpoint) do nothing;

-- PostgREST filters can't compare two columns, so process-postings uses this.
create or replace function raw_postings_to_process(p_limit int default 200)
returns setof raw_postings
language sql
stable
set search_path = public
as $$
  select * from raw_postings
  where processed_hash is distinct from body_hash
  order by fetched_at
  limit p_limit;
$$;

revoke execute on function raw_postings_to_process(int) from public, anon, authenticated;
