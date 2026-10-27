-- Programa el correu de dilluns. Executa-ho un cop a Supabase → SQL Editor, després de desplegar la funció
-- monday-summary i de posar-hi els secrets. Canvia <PROJECT_REF> i <CRON_SECRET> (el mateix valor que el secret de la funció).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('estirada-monday-summary') where exists (select 1 from cron.job where jobname = 'estirada-monday-summary');
-- 05:00 UTC = 07:00 a l'estiu i 06:00 a l'hivern (hora de Barcelona).
select cron.schedule('estirada-monday-summary', '0 5 * * 1', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/monday-summary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
