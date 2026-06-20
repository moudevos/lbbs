update public.services
set is_active = true,
    deleted_at = null,
    deleted_by = null,
    allow_manual_price = true,
    is_custom_service = true,
    price = coalesce(price, 0)
where sku = 'CUSTOM';

drop policy if exists "authenticated can receive broadcasts" on realtime.messages;
create policy "authenticated can receive broadcasts"
on realtime.messages for select to authenticated using (true);

create or replace function public.notify_service_order_event()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
begin
  if tg_op <> 'INSERT' or new.origin <> 'local_device' then return null; end if;
  perform public.create_operational_notification(
    new.branch_id,
    'service_order.created_from_device',
    'Atencion enviada desde dispositivo',
    'Una atencion local esta pendiente de cobro.',
    'service_order',
    new.id,
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
