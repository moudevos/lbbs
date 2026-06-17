create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  category text,
  sale_price numeric(10,2) not null default 0,
  cost numeric(10,2),
  stock_current integer not null default 0,
  stock_minimum integer not null default 0,
  branch_id uuid references branches(id),
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  branch_id uuid references branches(id),
  service_order_id uuid references service_orders(id),
  movement_type text not null check (movement_type in ('sale', 'adjustment', 'void')),
  quantity_delta integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table service_orders
  add column if not exists origin text not null default 'walk_in',
  add column if not exists subtotal numeric(10,2) not null default 0,
  add column if not exists total_paid numeric(10,2) not null default 0,
  add column if not exists balance numeric(10,2) not null default 0,
  add column if not exists attended_at timestamptz not null default now();

alter table service_order_items
  add column if not exists item_type text not null default 'service',
  add column if not exists service_id uuid references services(id),
  add column if not exists product_id uuid references products(id),
  add column if not exists description text,
  add column if not exists quantity numeric(10,2) not null default 1,
  add column if not exists unit_price numeric(10,2) not null default 0,
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists subtotal numeric(10,2) not null default 0,
  add column if not exists barber_id uuid references employees(id),
  add column if not exists branch_id uuid references branches(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'service_orders_origin_check'
  ) then
    alter table service_orders
      add constraint service_orders_origin_check check (origin in ('walk_in', 'reservation'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'service_order_items_item_type_check'
  ) then
    alter table service_order_items
      add constraint service_order_items_item_type_check
      check (item_type in ('service', 'custom_service', 'product', 'manual_extra', 'reward_discount'));
  end if;
end $$;

alter table products enable row level security;
alter table product_stock_movements enable row level security;

drop policy if exists "products staff select" on products;
create policy "products staff select" on products
for select
using (
  is_active = true
  and (
    is_admin()
    or branch_id is null
    or branch_id = current_employee_branch_id()
  )
);

drop policy if exists "products admin write" on products;
create policy "products admin write" on products
for all
using (is_admin())
with check (is_admin());

drop policy if exists "stock_movements staff select" on product_stock_movements;
create policy "stock_movements staff select" on product_stock_movements
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
);

drop policy if exists "stock_movements staff insert" on product_stock_movements;
create policy "stock_movements staff insert" on product_stock_movements
for insert
with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
before update on products
for each row execute function set_updated_at();

create index if not exists idx_products_branch_id on products(branch_id);
create index if not exists idx_products_sku on products(sku);
create index if not exists idx_product_stock_movements_product_id on product_stock_movements(product_id);
create index if not exists idx_service_order_items_product_id on service_order_items(product_id);
create index if not exists idx_service_order_items_item_type on service_order_items(item_type);
create index if not exists idx_service_orders_origin on service_orders(origin);
create index if not exists idx_service_orders_attended_at on service_orders(attended_at desc);

insert into products (sku, name, description, category, sale_price, stock_current, stock_minimum)
values
  ('PROD-0001', 'Agua', 'Botella de agua', 'Bebidas', 3, 24, 6),
  ('PROD-0002', 'Gaseosa', 'Bebida gaseosa', 'Bebidas', 5, 24, 6),
  ('PROD-0003', 'Energizante', 'Bebida energizante', 'Bebidas', 8, 12, 4),
  ('PROD-0004', 'Cera', 'Cera para peinar', 'Productos', 25, 10, 2),
  ('PROD-0005', 'Gel', 'Gel para cabello', 'Productos', 18, 10, 2),
  ('PROD-0006', 'Shampoo', 'Shampoo masculino', 'Productos', 28, 8, 2),
  ('PROD-0007', 'After shave', 'Locion after shave', 'Productos', 30, 8, 2)
on conflict (sku) do nothing;
