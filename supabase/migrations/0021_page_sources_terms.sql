-- 2026-11-17 terms check of the `page` sources (docs/legal/page-sources-terms-2026-11-17.md).
-- Mercor's and OpenTrain's terms forbid scraping / automated collection without
-- written permission, so both stop here (lib/sources/pages.ts also skips them if
-- a row is switched back on). OneForma's terms have no such rule: it stays.
--
-- What we copied from those two sites goes: the stored page text (raw_postings)
-- and every job made from it that no mail ever carried. Jobs that were mailed
-- stay as closed rows, because past mails (matches) point at them; closed jobs
-- are never mailed or previewed again. The anonymous reaction stats
-- (job_engagement, category_daily_stats) hold no posting text and stay.

update public.sources
set active = false
where kind = 'page' and endpoint in ('work.mercor.com', 'www.opentrain.ai');

delete from public.jobs j
using public.raw_postings r, public.sources s
where j.raw_posting_id = r.id and s.id = r.source_id
  and s.kind = 'page' and s.endpoint in ('work.mercor.com', 'www.opentrain.ai')
  and not exists (select 1 from public.matches m where m.job_id = j.id)
  and not exists (select 1 from public.applications a where a.job_id = j.id)
  and not exists (select 1 from public.reports x where x.job_id = j.id);

update public.jobs j
set status = 'closed'
from public.raw_postings r
join public.sources s on s.id = r.source_id
where j.raw_posting_id = r.id
  and s.kind = 'page' and s.endpoint in ('work.mercor.com', 'www.opentrain.ai')
  and j.status <> 'closed';

-- jobs.raw_posting_id is ON DELETE SET NULL.
delete from public.raw_postings r
using public.sources s
where s.id = r.source_id
  and s.kind = 'page' and s.endpoint in ('work.mercor.com', 'www.opentrain.ai');
