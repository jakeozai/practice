-- 덕잡: personal picks and page-site collection (2026-11-14).

-- 1) Each subscriber's three jobs for a send date, chosen from their AI profile
--    (lib/match, lib/workers/picks.ts). Prepared in the 05:30–05:50 KST
--    processing runs and read by the 06:00 send, so a rerun the same morning
--    sends exactly the same mail. Server only: RLS on, no policies.
create table digest_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  send_date date not null,                     -- Asia/Seoul
  job_ids uuid[] not null,
  notes jsonb not null default '{}'::jsonb,    -- job_id → { reason, today, score }
  subject text,
  method text not null check (method in ('llm', 'rules')),
  created_at timestamptz not null default now(),
  primary key (user_id, send_date)
);
alter table digest_picks enable row level security;

-- 2) Page sites (Mercor, OpenTrain, OneForma) list hundreds of new pages and
--    each page is fetched ≥1 s apart, so the daily collection can't drain them.
--    Extra page-only runs at 20:30, 22:30 and 00:30 KST (processing runs until 05:50).
create or replace function private.call_app_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_path not in ('/api/cron/collect', '/api/cron/collect-pages', '/api/cron/process', '/api/cron/digest') then
    raise exception 'unknown cron path: %', p_path;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cron_token';
  return net.http_get(
    url := 'https://duckjob.vercel.app' || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token),
    timeout_milliseconds := 300000
  );
end;
$$;

revoke execute on function private.call_app_cron(text) from public;

select cron.unschedule(jobid) from cron.job where jobname = 'duckjob-collect-pages';
select cron.schedule('duckjob-collect-pages', '30 11,13,15 * * *', $$select private.call_app_cron('/api/cron/collect-pages')$$);
