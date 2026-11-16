-- Retry scheduled app calls that never reached the app (2026-11-16).
-- With calls a few minutes apart, every other pg_net request failed at once
-- with "Error in the HTTP2 framing layer" (a reused connection the server had
-- closed); the next request opens a fresh one and works. Every call is now
-- logged, and a sweeper re-issues one that failed that way, up to 3 attempts.
-- Timeouts are not retried: the app got those requests. All cron routes are
-- safe to call again (the digest sends each person once a day, rule 9).

create table if not exists private.cron_calls (
  request_id bigint primary key,
  path text not null,
  attempt smallint not null default 1,
  retried_at timestamptz,
  created_at timestamptz not null default now()
);
alter table private.cron_calls enable row level security;
-- Only the database owner (cron, security-definer functions) touches this table.
drop policy if exists "no client access" on private.cron_calls;
create policy "no client access" on private.cron_calls for all to anon, authenticated using (false) with check (false);
revoke all on private.cron_calls from public, anon, authenticated;

-- Same path list and address as 0015 (CLAUDE.md "시간").
create or replace function private.send_app_cron(p_path text, p_attempt smallint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_id bigint;
begin
  if p_path not in ('/api/cron/collect', '/api/cron/collect-pages', '/api/cron/process', '/api/cron/digest', '/api/cron/picks', '/api/cron/picks-personas') then
    raise exception 'unknown cron path: %', p_path;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cron_token';
  v_id := net.http_get(
    url := 'https://www.duckjob.app' || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token),
    timeout_milliseconds := 300000
  );
  insert into private.cron_calls (request_id, path, attempt) values (v_id, p_path, p_attempt);
  return v_id;
end;
$$;

create or replace function private.call_app_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.send_app_cron(p_path, 1::smallint);
end;
$$;

create or replace function private.retry_failed_cron_calls()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select c.request_id, c.path, c.attempt
    from private.cron_calls c
    join net._http_response h on h.id = c.request_id
    where c.retried_at is null
      and c.attempt < 3
      and c.created_at > now() - interval '30 minutes'
      and h.status_code is null
      and h.error_msg is not null
      and coalesce(h.timed_out, false) = false
    for update of c skip locked
  loop
    update private.cron_calls set retried_at = now() where request_id = r.request_id;
    perform private.send_app_cron(r.path, (r.attempt + 1)::smallint);
    n := n + 1;
  end loop;
  delete from private.cron_calls where created_at < now() - interval '3 days';
  return n;
end;
$$;

revoke execute on function private.send_app_cron(text, smallint) from public, anon, authenticated;
revoke execute on function private.call_app_cron(text) from public, anon, authenticated;
revoke execute on function private.retry_failed_cron_calls() from public, anon, authenticated;

select cron.unschedule('duckjob-cron-retry') where exists (select 1 from cron.job where jobname = 'duckjob-cron-retry');
select cron.schedule('duckjob-cron-retry', '* * * * *', 'select private.retry_failed_cron_calls()');
