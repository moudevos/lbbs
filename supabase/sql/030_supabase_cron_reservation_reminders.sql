create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.process_reservation_reminders()
returns integer
language plpgsql
security definer
set search_path = public, extensions, cron, net
as $$
declare
  v_now_lima timestamp;
  v_from_lima timestamp;
  v_to_lima timestamp;
  v_reservation record;
  v_reminder_id uuid;
  v_sent integer := 0;
  v_customer_name text;
  v_service_name text;
  v_barber_name text;
begin
  v_now_lima := timezone('America/Lima', now());
  v_from_lima := v_now_lima + interval '15 minutes';
  v_to_lima := v_now_lima + interval '25 minutes';

  for v_reservation in
    select r.id, r.branch_id, r.starts_at, r.status, r.customer_id, r.service_id, r.employee_id
    from public.reservations r
    where r.status = 'confirmado'
      and timezone('America/Lima', r.starts_at) >= v_from_lima
      and timezone('America/Lima', r.starts_at) < v_to_lima
      and not exists (
        select 1
        from public.service_orders so
        where so.reservation_id = r.id
          and so.status in ('pagado', 'anulado')
      )
  loop
    v_reminder_id := null;
    insert into public.reservation_reminders (
      reservation_id, branch_id, remind_at, status
    ) values (
      v_reservation.id,
      v_reservation.branch_id,
      v_reservation.starts_at - interval '20 minutes',
      'pending'
    )
    on conflict (reservation_id) do nothing
    returning id into v_reminder_id;

    if v_reminder_id is null then
      continue;
    end if;

    select coalesce(c.full_name, 'Cliente')
      into v_customer_name
      from public.customers c
      where c.id = v_reservation.customer_id;

    select coalesce(s.name, 'Servicio')
      into v_service_name
      from public.services s
      where s.id = v_reservation.service_id;

    select nullif(trim(concat_ws(' ', e.first_name, e.last_name)), '')
      into v_barber_name
      from public.employees e
      where e.id = v_reservation.employee_id;

    if to_regprocedure('public.create_operational_notification(uuid,text,text,text,text,uuid,text,jsonb)') is not null then
      execute $sql$
        select public.create_operational_notification($1,$2,$3,$4,$5,$6,$7,$8)
      $sql$
      using
        v_reservation.branch_id,
        'reservation.reminder',
        'Reserva en 20 minutos',
        'Cliente: ' || coalesce(v_customer_name, 'Cliente')
          || ' · Servicio: ' || coalesce(v_service_name, 'Servicio')
          || case when v_barber_name is not null then ' · Barbero: ' || v_barber_name else '' end,
        'reservation',
        v_reservation.id,
        '/app/control/agenda',
        jsonb_build_object(
          'reservation_id', v_reservation.id,
          'starts_at', v_reservation.starts_at,
          'timezone', 'America/Lima'
        );
    else
      insert into public.notification_events (
        branch_id, type, title, body, target_type, target_id, url, payload, sent_at
      ) values (
        v_reservation.branch_id,
        'reservation.reminder',
        'Reserva en 20 minutos',
        'Cliente: ' || coalesce(v_customer_name, 'Cliente')
          || ' · Servicio: ' || coalesce(v_service_name, 'Servicio')
          || case when v_barber_name is not null then ' · Barbero: ' || v_barber_name else '' end,
        'reservation',
        v_reservation.id,
        '/app/control/agenda',
        jsonb_build_object(
          'reservation_id', v_reservation.id,
          'starts_at', v_reservation.starts_at,
          'timezone', 'America/Lima'
        ),
        now()
      );
    end if;

    update public.reservation_reminders
    set status = 'sent',
        sent_at = now()
    where id = v_reminder_id;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

grant execute on function public.process_reservation_reminders() to service_role;

do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'lbbs-reservation-reminders-every-5-min'
  ) then
    perform cron.unschedule('lbbs-reservation-reminders-every-5-min');
  end if;
end
$$;

select cron.schedule(
  'lbbs-reservation-reminders-every-5-min',
  '*/5 * * * *',
  $$select public.process_reservation_reminders();$$
);
