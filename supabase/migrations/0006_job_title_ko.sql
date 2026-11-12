-- 덕잡: a short Korean title per job for the daily mail (2026-11-12).
-- Written by the same single LLM extraction call as summary_ko (CLAUDE.md rule 10).
-- Null for manually added jobs and anything extracted before this column; the
-- mail then falls back to the original title.

alter table jobs add column if not exists title_ko text
  check (title_ko is null or char_length(title_ko) between 1 and 60);
