-- 덕잡: scope C (2026-11-14 user decision). Every short-term gig a Korea
-- resident can take where using AI is allowed or irrelevant — video editing
-- and production, Photoshop, 3D, motion, design, writing, development and AI
-- work. Gigs that forbid AI are excluded (decided per posting by the LLM).

-- 1) Freelancer.com public API as a source kind (lib/sources/freelancer.ts).
alter table sources drop constraint sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('greenhouse','lever','ashby','recruitee','page','manual','freelancer'));

insert into sources (name, kind, endpoint, trusted) values
  ('Freelancer.com (단기 의뢰)', 'freelancer', 'gigs', true)
on conflict (kind, endpoint) do nothing;

-- 2) Categories for the wider scope, shown as a chip on mail cards.
alter table jobs drop constraint if exists jobs_category_check;
alter table jobs add constraint jobs_category_check
  check (category in ('language','domain','labeling','video','design','motion_3d','dev','writing','other'));
