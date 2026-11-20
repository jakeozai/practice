-- Morning mail for thousands of subscribers (2026-11-20).
-- The app now sends several mails at once, as fast as the mail service allows
-- (lib/email/rate.ts), about 2,000 per run. Whoever one run doesn't reach gets
-- the next: pg_cron calls the digest again every 5 minutes until 06:30 KST,
-- but only while an active subscriber has no row for today yet.
--
-- 1) One run at a time per send date. SES has no idempotency key, so two runs
--    that overlap (a retried call, the 07:00 backup, an operator run) must not
--    both mail the same person. The lease expires on its own if a run dies.
-- 2) sent_job_ids: which of the jobs in play each subscriber already got, one
--    row per subscriber, instead of reading their whole matches history.
-- 3) The follow-up schedule.

-- 1) Lease
create table if not exists private.digest_run_lease (
  send_date date primary key,
  holder text not null,
  expires_at timestamptz not null
);
alter table private.digest_run_lease enable row level security;
drop policy if exists "no client access" on private.digest_run_lease;
create policy "no client access" on private.digest_run_lease for all to anon, authenticated using (false) with check (false);
revoke all on private.digest_run_lease from public, anon, authenticated;

create or replace function public.claim_digest_run(p_send_date date, p_holder text, p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into private.digest_run_lease as l (send_date, holder, expires_at)
  values (p_send_date, p_holder, now() + make_interval(secs => greatest(p_seconds, 1)))
  on conflict (send_date) do update
    set holder = excluded.holder, expires_at = excluded.expires_at
    where l.expires_at < now() or l.holder = excluded.holder;
  get diagnostics n = row_count;
  delete from private.digest_run_lease where send_date < current_date - 7;
  return n > 0;
end;
$$;

create or replace function public.release_digest_run(p_send_date date, p_holder text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.digest_run_lease where send_date = p_send_date and holder = p_holder;
$$;

revoke execute on function public.claim_digest_run(date, text, integer) from public, anon, authenticated;
revoke execute on function public.release_digest_run(date, text) from public, anon, authenticated;

-- 2) Already-sent jobs among the ones in play (service role only; RLS still applies to anyone else)
create or replace function public.sent_job_ids(p_user_ids uuid[], p_job_ids uuid[])
returns table (user_id uuid, job_ids uuid[])
language sql
stable
security invoker
set search_path = ''
as $$
  select m.user_id, array_agg(m.job_id)
  from public.matches m
  where m.user_id = any(p_user_ids)
    and m.job_id = any(p_job_ids)
  group by m.user_id;
$$;

revoke execute on function public.sent_job_ids(uuid[], uuid[]) from public, anon, authenticated;

-- 3) Follow-up calls: 06:05 … 06:30 KST, only while someone active has no row today.
create or replace function private.digest_has_unreached()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.digest_status = 'active'
      and not exists (
        select 1 from public.digest_sends d
        where d.user_id = p.user_id
          and d.send_date = (now() at time zone 'Asia/Seoul')::date
      )
  );
$$;

revoke execute on function private.digest_has_unreached() from public, anon, authenticated;

select cron.unschedule('duckjob-digest-followup') where exists (select 1 from cron.job where jobname = 'duckjob-digest-followup');
select cron.schedule(
  'duckjob-digest-followup',
  '5,10,15,20,25,30 21 * * *',
  $$select private.call_app_cron('/api/cron/digest') where private.digest_has_unreached()$$
);
