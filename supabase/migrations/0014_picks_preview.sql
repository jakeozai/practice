-- 2026-11-14: /api/cron/picks is a dry run by default (the next mail's
-- personal picks, nothing stored), so operators can preview it through the
-- same helper the schedules use instead of handling the token themselves.
-- Paths as of 0013_app_domain.
create or replace function private.call_app_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_path not in ('/api/cron/collect', '/api/cron/collect-pages', '/api/cron/process', '/api/cron/digest', '/api/cron/picks') then
    raise exception 'unknown cron path: %', p_path;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cron_token';
  return net.http_get(
    url := 'https://www.duckjob.app' || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token),
    timeout_milliseconds := 300000
  );
end;
$$;

revoke execute on function private.call_app_cron(text) from public;
