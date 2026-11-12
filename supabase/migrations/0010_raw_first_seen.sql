-- 덕잡: when a posting was first collected (2026-11-12), for the mail's top line
-- "지난 하루 새로 올라온 공고 N개 중 …". fetched_at changes whenever a posting
-- is re-saved; first_seen_at is set once on insert (collection never sends it).

alter table raw_postings add column if not exists first_seen_at timestamptz not null default now();

-- Existing rows: their first save is the best we know.
update raw_postings set first_seen_at = fetched_at where first_seen_at > fetched_at;

create index if not exists raw_postings_first_seen_idx on raw_postings (first_seen_at);
