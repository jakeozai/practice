-- 이용약관 (2026-11-17). Signing up on /auth/confirm needs the required box
-- "만 14세 이상이고, 이용약관에 동의해요"; which version was agreed to, and when,
-- is kept here as the record that the terms bind the member.
alter table public.profiles
  add column if not exists terms_version text check (terms_version is null or char_length(terms_version) <= 20),
  add column if not exists terms_agreed_at timestamptz;
