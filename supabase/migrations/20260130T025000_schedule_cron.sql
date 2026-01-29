-- Enable pg_cron (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create the cron job
SELECT cron.schedule(
  'process-classification-queue', -- job name
  '* * * * *',                   -- every minute
  $$
    select
      net.http_post(
          url:='https://uwkcraqyssbfbaeoricm.supabase.co/functions/v1/auto_apply_tags/process-queue',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_IVyzip1ImnxBK5Ms86tO2g_j-J9pb2D"}'::jsonb,
          body:='{"batch_size": 5}'::jsonb
      ) as request_id;
  $$
);
