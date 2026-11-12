-- 덕잡: process postings in small paced runs (2026-11-12).
--
-- The Vercel AI Gateway free tier allows 5 LLM requests per minute, so
-- /api/cron/process runs every 10 minutes and spaces its calls; a run with
-- nothing waiting ends at once. Collection (/api/cron/collect) stays daily.
-- Postings that mention Korea or Korean are processed first, so a short
-- budget goes to the jobs most likely to be sent.

create or replace function private.call_app_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_path not in ('/api/cron/collect', '/api/cron/process', '/api/cron/digest') then
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

create or replace function raw_postings_to_process(p_limit int default 200)
returns setof raw_postings
language sql
stable
set search_path = public
as $$
  select * from raw_postings
  where processed_hash is distinct from body_hash
  order by
    (coalesce(title, '') || ' ' || coalesce(location_raw, '') || ' ' || left(coalesce(body, ''), 20000))
      ~* '(korea|korean|한국)' desc,
    fetched_at
  limit p_limit;
$$;

revoke execute on function raw_postings_to_process(int) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'duckjob-process';
select cron.schedule('duckjob-process', '*/10 * * * *', $$select private.call_app_cron('/api/cron/process')$$);
