alter table public.products
  add column if not exists tracks_stock boolean not null default true,
  add column if not exists courtesy_enabled boolean not null default false,
  add column if not exists courtesy_role text,
  add column if not exists courtesy_label text;

update public.products
set cost_price = cost
where cost_price is null and cost is not null;

update public.products
set
  courtesy_enabled = true,
  courtesy_role = case
    when lower(name) like '%agua%' then 'water'
    when lower(name) like '%gaseosa%' or lower(name) like '%coca%' or lower(name) like '%inka%' or lower(name) like '%inca%' or lower(name) like '%fanta%' or lower(name) like '%sprite%' then 'soda'
    when lower(name) like '%frozen%' then 'frozen'
    when lower(name) like '%capuchino%' or lower(name) like '%cappuccino%' then 'cappuccino'
    when lower(name) like '%cafe%' or lower(name) like '%café%' then 'coffee'
    when lower(name) like '%keke%' or lower(name) like '%queque%' then 'keke'
    else courtesy_role
  end,
  courtesy_label = coalesce(courtesy_label, name)
where deleted_at is null
  and is_active = true
  and (
    lower(name) like '%agua%'
    or lower(name) like '%gaseosa%'
    or lower(name) like '%coca%'
    or lower(name) like '%inka%'
    or lower(name) like '%inca%'
    or lower(name) like '%fanta%'
    or lower(name) like '%sprite%'
    or lower(name) like '%frozen%'
    or lower(name) like '%cafe%'
    or lower(name) like '%café%'
    or lower(name) like '%capuchino%'
    or lower(name) like '%cappuccino%'
    or lower(name) like '%keke%'
    or lower(name) like '%queque%'
  );

alter table public.service_order_items
  add column if not exists line_total numeric(10,2) not null default 0,
  add column if not exists courtesy_role text,
  add column if not exists courtesy_group_id uuid,
  add column if not exists courtesy_group_label text;

alter table public.product_stock_movements
  add column if not exists service_order_item_id uuid references public.service_order_items(id) on delete set null;

alter table public.product_stock_movements
  drop constraint if exists product_stock_movements_kind_check;

alter table public.product_stock_movements
  add constraint product_stock_movements_kind_check
  check (
    movement_kind is null
    or movement_kind in (
      'ingreso',
      'ajuste_positivo',
      'ajuste_negativo',
      'venta',
      'anulacion_venta',
      'reposicion_caja',
      'anulacion_reposicion_caja',
      'cortesia',
      'anulacion_cortesia'
    )
  );

do $$
begin
  alter table public.service_order_items drop constraint if exists service_order_items_item_type_check;
  alter table public.service_order_items add constraint service_order_items_item_type_check
    check (item_type in ('service', 'custom_service', 'product', 'snack', 'courtesy', 'manual_extra', 'reward_discount'));
end $$;

create index if not exists idx_products_branch_courtesy
on public.products(branch_id, courtesy_enabled, courtesy_role)
where deleted_at is null and is_active = true;

create index if not exists idx_products_branch_stock
on public.products(branch_id, stock_current)
where deleted_at is null and is_active = true;

create index if not exists idx_service_order_items_courtesy_group
on public.service_order_items(courtesy_group_id)
where item_type = 'courtesy';

create index if not exists idx_product_stock_movements_service_order_item
on public.product_stock_movements(service_order_item_id);
