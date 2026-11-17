-- 덕잡: 공고 반응 데이터 (2026-11-17 사용자 결정). 어떤 분야의 공고가 얼마나 올라오고, 메일에 실리고,
-- 클릭됐는지를 쌓아 스폰서 공고 가격의 근거로 쓴다. 사람이 아니라 공고·분야 단위 숫자만 남긴다
-- (개인을 알아볼 수 없는 집계). 탈퇴로 지워지는 matches와 달리 이 숫자는 남는다.

-- 1) 공고별 누적 반응. 공고 행이 정리돼도 숫자는 남도록 FK 없이 분야·출처를 함께 적는다.
create table job_engagement (
  job_id uuid primary key,
  category text,
  source_kind text,
  first_sent_on date,
  sent_core int not null default 0,      -- 맞춤 일감으로 실린 횟수
  sent_stretch int not null default 0,   -- AI로 도전으로 실린 횟수
  sent_shared int not null default 0,    -- 프로필 없는 공통 목록으로 실린 횟수
  clicks int not null default 0,         -- 모든 클릭 (다시 눌러도 셈)
  unique_clicks int not null default 0,  -- 받은 사람 중 처음 누른 사람 수
  last_clicked_at timestamptz,
  updated_at timestamptz not null default now()
);
create index job_engagement_category_idx on job_engagement (category, first_sent_on);
alter table job_engagement enable row level security; -- 정책 없음: service role만

-- 메일 한 통에 새로 실린 공고마다 +1 (p_kinds: core | stretch | shared)
create or replace function public.record_job_sends(p_job_ids uuid[], p_kinds text[], p_send_date date)
returns void language sql security definer set search_path = public as $$
  insert into job_engagement as e (job_id, category, source_kind, first_sent_on, sent_core, sent_stretch, sent_shared)
  select j.id, j.category, s.kind, p_send_date,
         (t.k = 'core')::int, (t.k = 'stretch')::int, (t.k not in ('core', 'stretch'))::int
  from unnest(p_job_ids, p_kinds) as t(job_id, k)
  join jobs j on j.id = t.job_id
  left join raw_postings r on r.id = j.raw_posting_id
  left join sources s on s.id = r.source_id
  on conflict (job_id) do update set
    sent_core = e.sent_core + excluded.sent_core,
    sent_stretch = e.sent_stretch + excluded.sent_stretch,
    sent_shared = e.sent_shared + excluded.sent_shared,
    category = coalesce(excluded.category, e.category),
    first_sent_on = least(e.first_sent_on, excluded.first_sent_on),
    updated_at = now();
$$;

-- 메일 속 공고 링크 클릭마다 +1 (p_first: 그 사람이 이 공고를 처음 누름)
create or replace function public.record_job_click(p_job_id uuid, p_first boolean)
returns void language sql security definer set search_path = public as $$
  insert into job_engagement as e (job_id, category, source_kind, clicks, unique_clicks, last_clicked_at)
  select j.id, j.category, s.kind, 1, p_first::int, now()
  from jobs j
  left join raw_postings r on r.id = j.raw_posting_id
  left join sources s on s.id = r.source_id
  where j.id = p_job_id
  on conflict (job_id) do update set
    clicks = e.clicks + 1,
    unique_clicks = e.unique_clicks + excluded.unique_clicks,
    last_clicked_at = now(),
    updated_at = now();
$$;

revoke execute on function public.record_job_sends(uuid[], text[], date) from public, anon, authenticated;
revoke execute on function public.record_job_click(uuid, boolean) from public, anon, authenticated;

-- 2) 분야·출처별 하루 집계 (Asia/Seoul 날짜). 매일 최근 7일을 다시 계산하고, 그 전 날짜는 그대로 둔다.
create table category_daily_stats (
  day date not null,
  category text not null,
  source_kind text not null,
  new_postings int not null default 0,     -- 그날 처음 들어와 보낼 수 있게 된 공고
  open_postings int not null default 0,    -- 그날 열려 있던 공고(근사: 그날 이후에도 목록에서 보인 공고)
  sent int not null default 0,             -- 메일에 실린 횟수
  sent_stretch int not null default 0,
  clicked int not null default 0,          -- 받은 사람이 누른 횟수(사람·공고당 1번)
  clicked_stretch int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, category, source_kind)
);
alter table category_daily_stats enable row level security; -- 정책 없음: service role만

create or replace function private.rollup_category_stats(p_day date)
returns void language sql security definer set search_path = public as $$
  with src as (
    select j.id, coalesce(j.category, 'other') as category, coalesce(s.kind, 'unknown') as source_kind,
           j.first_seen_at, j.last_seen_at, j.status
    from jobs j
    left join raw_postings r on r.id = j.raw_posting_id
    left join sources s on s.id = r.source_id
    where j.review_state = 'approved' and j.korea_eligible
  ),
  postings as (
    select category, source_kind,
           count(*) filter (where (first_seen_at at time zone 'Asia/Seoul')::date = p_day) as new_postings,
           count(*) filter (where (first_seen_at at time zone 'Asia/Seoul')::date <= p_day
                              and (status <> 'closed' or (last_seen_at at time zone 'Asia/Seoul')::date >= p_day)) as open_postings
    from src group by 1, 2
  ),
  sends as (
    select coalesce(j.category, 'other') as category, coalesce(s.kind, 'unknown') as source_kind,
           count(*) as sent,
           count(*) filter (where dp.notes -> (m.job_id::text) ->> 'kind' = 'stretch') as sent_stretch,
           count(*) filter (where m.clicked_at is not null) as clicked,
           count(*) filter (where m.clicked_at is not null and dp.notes -> (m.job_id::text) ->> 'kind' = 'stretch') as clicked_stretch
    from matches m
    join jobs j on j.id = m.job_id
    left join raw_postings r on r.id = j.raw_posting_id
    left join sources s on s.id = r.source_id
    left join digest_picks dp on dp.user_id = m.user_id and dp.send_date = m.send_date
    where m.send_date = p_day
    group by 1, 2
  )
  insert into category_daily_stats as c (day, category, source_kind, new_postings, open_postings, sent, sent_stretch, clicked, clicked_stretch, updated_at)
  select p_day, coalesce(p.category, x.category), coalesce(p.source_kind, x.source_kind),
         coalesce(p.new_postings, 0), coalesce(p.open_postings, 0),
         coalesce(x.sent, 0), coalesce(x.sent_stretch, 0), coalesce(x.clicked, 0), coalesce(x.clicked_stretch, 0), now()
  from postings p
  full join sends x on x.category = p.category and x.source_kind = p.source_kind
  where coalesce(p.new_postings, 0) + coalesce(p.open_postings, 0) + coalesce(x.sent, 0) > 0
  on conflict (day, category, source_kind) do update set
    new_postings = excluded.new_postings, open_postings = excluded.open_postings,
    sent = excluded.sent, sent_stretch = excluded.sent_stretch,
    clicked = excluded.clicked, clicked_stretch = excluded.clicked_stretch, updated_at = now();
$$;
revoke execute on function private.rollup_category_stats(date) from public;

-- 매일 23:50 KST: 최근 7일을 다시 계산 (늦게 들어온 클릭 반영)
select cron.schedule(
  'duckjob-category-stats',
  '50 14 * * *',
  $$select private.rollup_category_stats(d::date) from generate_series((now() at time zone 'Asia/Seoul')::date - 7, (now() at time zone 'Asia/Seoul')::date, interval '1 day') d$$
);

-- 3) 지금까지의 기록으로 채우기
insert into job_engagement (job_id, category, source_kind, first_sent_on, sent_core, sent_stretch, sent_shared, clicks, unique_clicks)
select m.job_id, j.category, s.kind, min(m.send_date),
       count(*) filter (where dp.notes -> (m.job_id::text) ->> 'kind' = 'core'),
       count(*) filter (where dp.notes -> (m.job_id::text) ->> 'kind' = 'stretch'),
       count(*) filter (where coalesce(dp.notes -> (m.job_id::text) ->> 'kind', '') not in ('core', 'stretch')),
       count(*) filter (where m.clicked_at is not null),
       count(*) filter (where m.clicked_at is not null)
from matches m
join jobs j on j.id = m.job_id
left join raw_postings r on r.id = j.raw_posting_id
left join sources s on s.id = r.source_id
left join digest_picks dp on dp.user_id = m.user_id and dp.send_date = m.send_date
group by m.job_id, j.category, s.kind
on conflict (job_id) do nothing;

select private.rollup_category_stats(d::date)
from generate_series(
  coalesce((select min((first_seen_at at time zone 'Asia/Seoul')::date) from jobs), (now() at time zone 'Asia/Seoul')::date),
  (now() at time zone 'Asia/Seoul')::date, interval '1 day') d;
