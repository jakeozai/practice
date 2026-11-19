-- 덕잡: 일일 메일 평가(좋아요·쏘쏘·싫어요)와 한 줄 의견 (2026-11-16 사용자 결정).
-- 메일 버튼은 확인 페이지만 열고, 저장은 그 페이지의 POST(/api/rate)로만 한다(CLAUDE.md 규칙 8).
-- 구독자 한 명당 발송일 하나에 한 줄이며, 다시 보내면 고친다. 탈퇴하면 함께 지워진다.
create table mail_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  send_date date not null,
  rating text not null check (rating in ('good', 'soso', 'bad')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, send_date)
);

create index mail_feedback_updated_idx on mail_feedback (updated_at desc);

-- 정책 없음: /api/rate와 관리자 화면이 service role로만 읽고 쓴다.
alter table mail_feedback enable row level security;
