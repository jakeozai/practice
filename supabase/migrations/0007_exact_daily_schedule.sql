-- 덕잡: the daily mail goes out at 06:00 KST sharp (2026-11-12 decision).
--
-- Vercel Hobby crons fire somewhere within the scheduled hour, so Supabase
-- pg_cron calls the app at the exact minute through pg_net. The bearer token
-- is created here inside Vault and checked by the app with verify_cron_token();
-- it never leaves the database except inside that HTTPS request.
-- vercel.json keeps its own crons as a backup (the digest is safe to run twice
-- a day: sent/skipped users are not mailed again).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cron_token',
      'Bearer token pg_cron sends to /api/cron/*'
    );
  end if;
end $$;

-- Called by the app (service role) to accept a pg_cron request.
create or replace function public.verify_cron_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Digests are compared so the check time doesn't depend on how much of the token matches.
  select coalesce(
    (select extensions.digest(s.decrypted_secret, 'sha256') = extensions.digest(coalesce(p_token, ''), 'sha256')
       from vault.decrypted_secrets s
      where s.name = 'cron_token'),
    false
  );
$$;

revoke execute on function public.verify_cron_token(text) from public, anon, authenticated;
grant execute on function public.verify_cron_token(text) to service_role;

-- Not exposed through the API (only public is).
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.call_app_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_path not in ('/api/cron/collect', '/api/cron/digest') then
    raise exception 'unknown cron path: %', p_path;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cron_token';
  -- The routes run up to 300 s (maxDuration); the response lands in net._http_response.
  return net.http_get(
    url := 'https://duckjob.vercel.app' || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token),
    timeout_milliseconds := 300000
  );
end;
$$;

revoke execute on function private.call_app_cron(text) from public;

-- pg_cron uses UTC: 21:00 UTC = 06:00 KST the next day.
select cron.unschedule(jobid) from cron.job where jobname = 'duckjob-digest';
select cron.schedule('duckjob-digest', '0 21 * * *', $$select private.call_app_cron('/api/cron/digest')$$);
