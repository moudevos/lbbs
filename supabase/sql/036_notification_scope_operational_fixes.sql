create or replace function public.notify_reservation_event()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
declare
  v_customer text;
begin
  -- Solo una reserva nueva genera aviso. Las acciones internas posteriores
  -- refrescan las vistas, pero no llenan el centro de notificaciones.
  if tg_op <> 'INSERT' then return null; end if;
  select coalesce(full_name, 'Cliente') into v_customer from public.customers where id = new.customer_id;
  perform public.create_operational_notification(
    new.branch_id, 'reservation.created', 'Nueva reserva web',
    v_customer || ' registro una reserva.', 'reservation', new.id,
    '/app/control/reservas',
    jsonb_build_object('reservation_id', new.id, 'status', new.status, 'starts_at', new.starts_at)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_reservation_event on public.reservations;
create trigger trg_notify_reservation_event
after insert on public.reservations
for each row execute function public.notify_reservation_event();

create or replace function public.notify_service_order_event()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
begin
  -- Dashboard no se notifica a si mismo. Solo el flujo local/dispositivo
  -- crea la alerta operativa para caja.
  if tg_op <> 'INSERT' or new.origin <> 'local_device' then return null; end if;
  perform public.create_operational_notification(
    new.branch_id, 'service_order.created_from_device',
    'Atencion enviada desde dispositivo',
    'Una atencion local esta pendiente de cobro.',
    'service_order', new.id,
    '/app/control/atenciones/' || new.id::text,
    jsonb_build_object('service_order_id', new.id, 'status', new.status, 'origin', new.origin)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_service_order_event on public.service_orders;
create trigger trg_notify_service_order_event
after insert on public.service_orders
for each row execute function public.notify_service_order_event();
