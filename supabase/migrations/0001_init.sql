-- AI잡5 (가칭) 초기 스키마
-- 원칙: 공고 원문(body)은 raw_postings에만, 사용자 노출은 jobs.summary_ko + url만.
--       사용자가 붙여넣은 AI 답변 원문은 저장하지 않고 검증된 필드만 profiles에 저장.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- 수집 소스
-- ─────────────────────────────────────────────
create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,                          -- 예: 'Mercor'
  kind text not null check (kind in ('greenhouse','lever','ashby','page','manual')),
  endpoint text,                               -- board token / company slug / 공개 페이지 URL
  trusted boolean not null default false,      -- true면 조건 충족 시 검수 없이 자동 승인
  active boolean not null default true,
  fail_count int not null default 0,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 원본 공고 (처리용, 외부 노출 금지)
-- ─────────────────────────────────────────────
create table raw_postings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  external_id text not null,
  url text not null,
  title text,
  location_raw text,
  body text,
  body_hash text not null,
  fetched_at timestamptz not null default now(),
  processed_hash text,                         -- 마지막으로 처리한 body_hash. 다르면 재처리
  unique (source_id, external_id)
);

-- ─────────────────────────────────────────────
-- 정제된 공고 (발행 단위)
-- ─────────────────────────────────────────────
create table jobs (
  id uuid primary key default gen_random_uuid(),
  raw_posting_id uuid unique references raw_postings(id) on delete set null,
  company text not null,
  title text not null,
  title_normalized text not null,              -- 재게시 판정용: 소문자, 공백·기호 정리
  url text not null,
  summary_ko text[] not null default '{}',     -- 3줄 요약. 원문 번역·복제 금지
  category text check (category in ('language','domain','labeling','other')),
  languages text[] not null default '{}',
  requires_credential boolean not null default false,  -- 학위·자격증 필요 → MVP 발송 제외
  korea_eligible boolean,
  eligibility_note text,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  pay_unit text check (pay_unit in ('hour','task','project','month')),
  hours_per_week_min int,
  english_level text check (english_level in ('none','reading','conversational','business','native')),
  status text not null default 'unknown' check (status in ('open','pool','closed','unknown')),
  repost_count int not null default 0,
  scam_score int not null default 0 check (scam_score between 0 and 100),
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missing_count int not null default 0,        -- 연속 미수집 횟수. 2회면 status = closed
  embedding vector(1536)
);

create index jobs_review_idx on jobs (review_state, korea_eligible, status);
create index jobs_first_seen_idx on jobs (first_seen_at desc);
create index jobs_repost_idx on jobs (company, title_normalized);
create index jobs_embedding_idx on jobs using hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────
-- 사용자 프로필 (auth.users 1:1)
-- ─────────────────────────────────────────────
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  digest_status text not null default 'active'
    check (digest_status in ('active','paused','unsubscribed','bounced')),
  profile_json jsonb,                          -- lib/profile/parse.ts 통과한 값만
  profile_source text check (profile_source in ('ai_import','form')),
  profile_imported_at timestamptz,
  -- 매칭용으로 펼친 필드
  english_level text check (english_level in ('none','reading','conversational','business','native')),
  fields text[] not null default '{}',
  skills text[] not null default '{}',
  avoid text[] not null default '{}',
  weekly_hours int,
  min_hourly_usd numeric,
  has_desktop boolean,
  embedding vector(1536),
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 매칭 결과 (PK로 같은 공고 재발송 방지)
-- ─────────────────────────────────────────────
create table matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  send_date date not null,                     -- Asia/Seoul 기준 발송일
  rank smallint not null,
  score real not null,
  reason_ko text,
  clicked_at timestamptz,
  feedback text check (feedback in ('interested','not_interested')),
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index matches_send_date_idx on matches (send_date);

-- ─────────────────────────────────────────────
-- 일일 발송 기록 (같은 날 중복 발송 방지)
-- ─────────────────────────────────────────────
create table digest_sends (
  user_id uuid not null references auth.users(id) on delete cascade,
  send_date date not null,
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  job_count smallint not null default 0,
  resend_message_id text,
  error text,
  created_at timestamptz not null default now(),
  primary key (user_id, send_date)
);

-- ─────────────────────────────────────────────
-- 지원 기록
-- ─────────────────────────────────────────────
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  draft_en jsonb,                              -- { profile_headline, cover_note, answers: [{q, a}] }
  status text not null default 'drafted'
    check (status in ('drafted','applied','assessment','accepted','rejected','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ─────────────────────────────────────────────
-- 후기 (해자)
-- ─────────────────────────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_id uuid references jobs(id) on delete set null,
  stage_reached text check (stage_reached in ('applied','assessment','accepted','paid')),
  paid_as_promised boolean,
  actual_hourly_usd numeric,
  project_days int,
  tips_ko text check (char_length(tips_ko) <= 1000),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 신고
-- ─────────────────────────────────────────────
create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS
-- service role은 RLS를 우회한다. 아래 정책은 로그인 사용자(anon key) 기준.
-- ─────────────────────────────────────────────
alter table sources       enable row level security;  -- 정책 없음 = 서비스 전용
alter table raw_postings  enable row level security;  -- 정책 없음 = 서비스 전용
alter table digest_sends  enable row level security;  -- 정책 없음 = 서비스 전용
alter table jobs          enable row level security;
alter table profiles      enable row level security;
alter table matches       enable row level security;
alter table applications  enable row level security;
alter table reviews       enable row level security;
alter table reports       enable row level security;

-- 승인된 공고만 누구나 읽기 (메일 링크로 들어온 비로그인 사용자 포함)
create policy jobs_public_read on jobs
  for select to anon, authenticated
  using (review_state = 'approved');

create policy profiles_own_select on profiles
  for select to authenticated using (auth.uid() = user_id);
create policy profiles_own_update on profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy matches_own_select on matches
  for select to authenticated using (auth.uid() = user_id);

create policy applications_own_select on applications
  for select to authenticated using (auth.uid() = user_id);
create policy applications_own_update on applications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reviews_own_select on reviews
  for select to authenticated using (auth.uid() = user_id);
create policy reviews_own_insert on reviews
  for insert to authenticated with check (auth.uid() = user_id);

create policy reports_own_insert on reports
  for insert to authenticated with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 매칭 후보 조회 (워커가 service role로 호출)
-- 영어 수준·주당 시간·avoid·점수 계산은 lib/match.ts에서.
-- ─────────────────────────────────────────────
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
    and j.requires_credential is false
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
