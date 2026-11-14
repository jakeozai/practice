-- 덕잡: sources that name the hiring company (2026-11-14 supply check,
-- docs/supply-check-2026-11-14.md). Freelancer.com clients are anonymous,
-- which 직업안정법 시행령 제28조 may not allow; these boards list named companies.
--   jobicy     endpoint = Jobicy geo slug (one call a day; terms allow ≤ 1/hour)
--   himalayas  endpoint = country code; runs only when HIMALAYAS_API_KEY is set
--   Superside  a design company's Lever board (contract creative roles)

alter table sources drop constraint sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('greenhouse','lever','ashby','recruitee','page','manual','freelancer','jobicy','himalayas'));

insert into sources (name, kind, endpoint, trusted) values
  ('Jobicy (원격 계약·파트타임)', 'jobicy', 'south-korea', true),
  ('Himalayas (원격 계약·파트타임)', 'himalayas', 'KR', true),
  ('Superside', 'lever', 'superside', true)
on conflict (kind, endpoint) do nothing;
