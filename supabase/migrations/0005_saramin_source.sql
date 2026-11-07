-- 사람인 official Open API as a source kind (lib/sources/saramin.ts).
-- Korean job boards are used only through official APIs (crawling their listings is the
-- 잡코리아 v. 사람인 database-right case). Skipped by the collector until SARAMIN_ACCESS_KEY is set.

alter table sources drop constraint sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('greenhouse','lever','ashby','recruitee','saramin','page','manual'));

insert into sources (name, kind, endpoint, trusted) values
  ('사람인 (AI 단기 일감 검색)', 'saramin', 'ai-short-term', true)
on conflict (kind, endpoint) do nothing;
