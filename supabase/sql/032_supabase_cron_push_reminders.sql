create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The database creates and broadcasts reminder events. The application push
-- sender delivers Web Push when invoked through the documented fallback API.
create or replace function public.test_reservation_reminder_job()
returns integer
language sql
security definer
set search_path = public
as $$
  select public.process_reservation_reminders();
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'lbbs-reservation-reminders-every-5-min') then
    perform cron.unschedule('lbbs-reservation-reminders-every-5-min');
  end if;
end
$$;

select cron.schedule(
  'lbbs-reservation-reminders-every-5-min',
  '*/5 * * * *',
  $$select public.process_reservation_reminders();$$
);

grant execute on function public.test_reservation_reminder_job() to service_role;
