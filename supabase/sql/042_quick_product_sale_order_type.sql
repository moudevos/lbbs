alter table public.service_orders
  add column if not exists order_type text not null default 'service_order';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_orders_order_type_check'
  ) then
    alter table public.service_orders
      add constraint service_orders_order_type_check
      check (order_type in ('service_order', 'product_sale', 'mixed_order'));
  end if;
end $$;

create index if not exists idx_service_orders_order_type
  on public.service_orders(order_type, service_date, branch_id, status);
