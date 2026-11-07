-- AI work platforms' own public work pages, collected as kind = 'page'
-- (sitemap + schema.org JobPosting JSON-LD, robots.txt checked; lib/sources/pages.ts).
-- Mirrors the page entries of lib/sources/seeds.ts.
-- OpenTrain is a marketplace where third-party clients post work, so it is not trusted
-- (its jobs always go through the review queue).

insert into sources (name, kind, endpoint, trusted) values
  ('Mercor (work listings)', 'page', 'work.mercor.com', true),
  ('OpenTrain AI', 'page', 'www.opentrain.ai', false),
  ('OneForma', 'page', 'www.oneforma.com', true)
on conflict (kind, endpoint) do nothing;
