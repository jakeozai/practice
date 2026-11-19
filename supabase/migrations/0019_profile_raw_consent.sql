-- 덕잡: (선택) AI 분석 원문 수집·이용 동의 (2026-11-17 사용자 결정).
-- 동의한 사람의 붙여넣은 AI 답변 전체(스펙 요약·이력서 포함)만 저장한다. 동의하지 않으면 지금처럼
-- 확인한 프로필 항목만 저장한다(개인정보 보호법 제15조 제1항 제1호·제2항, 제22조).
-- 철회하면 저장한 원문을 지우고, 탈퇴하면 함께 지워진다.
alter table profiles
  add column raw_consent_at timestamptz,
  add column raw_consent_version text;

create table profile_raw (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null check (char_length(raw_text) <= 20000),
  consent_version text not null,
  created_at timestamptz not null default now()
);

create index profile_raw_user_idx on profile_raw (user_id, created_at desc);

-- 정책 없음: /api/profile/save가 service role로 쓰고, 운영자만 읽는다.
alter table profile_raw enable row level security;
