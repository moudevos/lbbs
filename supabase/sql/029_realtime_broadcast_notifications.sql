alter table notification_events add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists idx_notification_events_branch_created
on notification_events(branch_id, created_at desc);
create index if not exists idx_notification_events_type_created
on notification_events(type, created_at desc);

drop policy if exists "authenticated can receive broadcasts" on realtime.messages;
create policy "authenticated can receive broadcasts"
on realtime.messages for select to authenticated using (true);

create or replace function public.create_operational_notification(
  p_branch_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_url text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_id uuid;
  v_message jsonb;
begin
  insert into public.notification_events (
    branch_id, type, title, body, target_type, target_id, url, payload, sent_at
  ) values (
    p_branch_id, p_type, p_title, p_body, p_target_type, p_target_id, p_url,
    coalesce(p_payload, '{}'::jsonb), now()
  ) returning id into v_id;

  v_message := jsonb_build_object(
    'id', v_id, 'branch_id', p_branch_id, 'type', p_type, 'title', p_title,
    'body', p_body, 'target_type', p_target_type, 'target_id', p_target_id,
    'url', p_url, 'payload', coalesce(p_payload, '{}'::jsonb), 'created_at', now()
  );
  perform realtime.send(v_message, p_type, 'branch:' || p_branch_id::text, false);
  return v_id;
end;
$$;

create or replace function public.notify_reservation_event()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
declare
  v_type text;
  v_title text;
  v_body text;
  v_customer text;
begin
  select coalesce(full_name, 'Cliente') into v_customer from public.customers where id = new.customer_id;
  if tg_op = 'INSERT' then
    v_type := 'reservation.created'; v_title := 'Nueva reserva';
    v_body := v_customer || ' registro una reserva.';
  elsif old.status is distinct from new.status then
    v_type := 'reservation.status_changed'; v_title := 'Reserva actualizada';
    v_body := 'La reserva cambio de ' || old.status || ' a ' || new.status || '.';
  elsif old.starts_at is distinct from new.starts_at then
    v_type := 'reservation.rescheduled'; v_title := 'Reserva reprogramada';
    v_body := 'La reserva de ' || v_customer || ' fue reprogramada.';
  else
    v_type := 'reservation.updated'; v_title := 'Reserva editada';
    v_body := 'Se actualizaron datos de la reserva de ' || v_customer || '.';
  end if;
  perform public.create_operational_notification(
    new.branch_id, v_type, v_title, v_body, 'reservation', new.id,
    '/app/control/reservas',
    jsonb_build_object('reservation_id', new.id, 'status', new.status, 'starts_at', new.starts_at)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_reservation_event on public.reservations;
create trigger trg_notify_reservation_event after insert or update on public.reservations
for each row execute function public.notify_reservation_event();

create or replace function public.notify_service_order_event()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
declare
  v_type text;
  v_title text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pendiente_pago' then
      v_type := 'service_order.pending_payment'; v_title := 'Atencion pendiente';
      v_body := 'Nueva atencion pendiente de cobro.';
    else
      v_type := 'service_order.created'; v_title := 'Atencion creada';
      v_body := 'Se registro una nueva atencion.';
    end if;
  elsif old.status is distinct from new.status then
    if new.status = 'pagado' then
      v_type := 'service_order.paid'; v_title := 'Atencion pagada'; v_body := 'La atencion fue pagada.';
    elsif new.status = 'anulado' then
      v_type := 'service_order.voided'; v_title := 'Atencion anulada'; v_body := 'La atencion fue anulada.';
    elsif new.status = 'pendiente_pago' then
      v_type := 'service_order.pending_payment'; v_title := 'Atencion pendiente'; v_body := 'La atencion esta pendiente de cobro.';
    else
      return null;
    end if;
  else
    return null;
  end if;
  perform public.create_operational_notification(
    new.branch_id, v_type, v_title, v_body, 'service_order', new.id,
    '/app/control/atenciones/' || new.id::text,
    jsonb_build_object('service_order_id', new.id, 'status', new.status, 'origin', new.origin)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_service_order_event on public.service_orders;
create trigger trg_notify_service_order_event after insert or update on public.service_orders
for each row execute function public.notify_service_order_event();

grant execute on function public.create_operational_notification(uuid,text,text,text,text,uuid,text,jsonb) to authenticated;
