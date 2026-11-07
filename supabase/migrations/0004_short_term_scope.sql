-- Scope: every short-term job that needs AI, in any language (user decision, 2026-11-07).
-- 1) Credentials no longer exclude a job; jobs.requires_credential is information only.
-- 2) jobs.engagement records the kind of work; open-ended staff hiring ('permanent') is not sent.

alter table jobs add column engagement text
  check (engagement in ('freelance','contract','part_time','permanent'));

create or replace function candidate_jobs_for_user(p_user_id uuid, p_limit int default 50)
returns table (
  job_id uuid,
  similarity double precision,
  first_seen_at timestamptz,
  pay_max numeric,
  pay_unit text,
  english_level text,
  hours_per_week_min int,
  title text,
  category text,
  languages text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select j.id,
         1 - (j.embedding <=> p.embedding) as similarity,
         j.first_seen_at,
         j.pay_max,
         j.pay_unit,
         j.english_level,
         j.hours_per_week_min,
         j.title,
         j.category,
         j.languages
  from jobs j
  join profiles p on p.user_id = p_user_id
  where j.review_state = 'approved'
    and j.korea_eligible is true
    and j.engagement is distinct from 'permanent'
    and j.status <> 'closed'
    and j.embedding is not null
    and p.embedding is not null
    and not exists (
      select 1 from matches m where m.user_id = p_user_id and m.job_id = j.id
    )
  order by j.embedding <=> p.embedding
  limit p_limit;
$$;

revoke execute on function candidate_jobs_for_user(uuid, int) from public, anon, authenticated;
