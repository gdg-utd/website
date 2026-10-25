-- Apply only after process-application-emails has been deployed and its authentication checked.
-- Supabase Vault holds the credential; the source contains no secret value.
select cron.schedule(
 'gdg-application-email-retries',
 '* * * * *',
 $job$
 select net.http_post(
  url:='https://fgapfnqaydzitjosnddk.supabase.co/functions/v1/process-application-emails',
  headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',(select decrypted_secret from vault.decrypted_secrets where name='application_email_worker_token')),
  body:='{}'::jsonb,
  timeout_milliseconds:=120000
 );
 $job$
);
