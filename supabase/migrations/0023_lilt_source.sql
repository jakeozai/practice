-- LILT's public Ashby board (2026-11-20 source search): AI training contributor,
-- subject-matter expert and voice gigs per language. 12 are "Korea (Remote)"
-- contract roles; other countries' roles are skipped by the location rule before
-- any LLM call. The hiring company (LILT, Inc.) is in lib/jobs/employers.ts.
insert into sources (name, kind, endpoint, trusted) values
  ('LILT (AI Training)', 'ashby', 'lilt-production', true)
on conflict (kind, endpoint) do nothing;
