-- Login-mail request records (0005, HMAC hashes of email and IP) are kept for
-- 1 day (privacy policy §3). claim_login_link only cleans up when someone asks
-- for a link, so on a quiet day old rows stayed. Delete them every hour, so
-- nothing is older than about 25 hours.
select cron.unschedule('duckjob-login-request-purge')
where exists (select 1 from cron.job where jobname = 'duckjob-login-request-purge');
select cron.schedule(
  'duckjob-login-request-purge',
  '17 * * * *',
  $$delete from public.login_link_requests where created_at < now() - interval '1 day'$$
);
