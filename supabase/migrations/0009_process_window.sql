-- 덕잡: run /api/cron/process only between collection and the morning mail
-- (2026-11-12). New postings arrive once a day around 19:00 KST, so processing
-- from 19:00 to 05:50 KST (10:00–20:50 UTC) covers them before the 06:00 send;
-- daytime runs would find nothing to do.

select cron.unschedule(jobid) from cron.job where jobname = 'duckjob-process';
select cron.schedule('duckjob-process', '*/10 10-20 * * *', $$select private.call_app_cron('/api/cron/process')$$);
