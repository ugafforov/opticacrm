
-- 1. Add daily report schedule columns
ALTER TABLE public.telegram_settings
  ADD COLUMN IF NOT EXISTS daily_report_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_report_hour int NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS daily_report_minute int NOT NULL DEFAULT 0;

-- 2. Admin RPC to reschedule the daily report
CREATE OR REPLACE FUNCTION public.set_daily_report_schedule(_hour int, _minute int, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  utc_hour int;
  cron_expr text;
  cmd text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _hour < 0 OR _hour > 23 OR _minute < 0 OR _minute > 59 THEN
    RAISE EXCEPTION 'Invalid time';
  END IF;

  -- Tashkent = UTC+5
  utc_hour := (_hour - 5 + 24) % 24;
  cron_expr := _minute::text || ' ' || utc_hour::text || ' * * *';

  UPDATE public.telegram_settings
     SET daily_report_hour = _hour,
         daily_report_minute = _minute,
         daily_report_enabled = _enabled,
         updated_at = now()
   WHERE id = 1;

  -- Remove any prior daily report jobs
  PERFORM cron.unschedule(jobname)
    FROM cron.job
   WHERE jobname IN ('daily-telegram-report', 'daily-telegram-report-2000-tashkent', 'daily-telegram-report-tashkent');

  IF _enabled THEN
    cmd := format(
      $c$
      SELECT net.http_post(
        url := 'https://kfzdexxtdrzevmtpyand.supabase.co/functions/v1/daily-telegram-report',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmemRleHh0ZHJ6ZXZtdHB5YW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MDA1NDAsImV4cCI6MjA4NTM3NjU0MH0.tvXkju_5aR_IvDjiFriRBauefV1wMWEZzyFQSKbjfuo"}'::jsonb,
        body := '{}'::jsonb
      );
      $c$
    );
    PERFORM cron.schedule('daily-telegram-report', cron_expr, cmd);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_daily_report_schedule(int, int, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_daily_report_schedule(int, int, boolean) TO authenticated;

-- 3. Apply default 08:00 Tashkent schedule immediately
SELECT public.set_daily_report_schedule(8, 0, true);
