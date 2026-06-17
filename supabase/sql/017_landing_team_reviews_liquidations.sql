alter table employees
  add column if not exists nickname text,
  add column if not exists specialty text,
  add column if not exists profile_photo_path text,
  add column if not exists profile_photo_url text,
  add column if not exists profile_photo_updated_at timestamptz,
  add column if not exists production_percentage numeric(5,2) not null default 50;

create index if not exists idx_employees_role_active_landing
  on employees(role, is_active);

create table if not exists customer_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  display_name text,
  phone text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  is_anonymous boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  source text not null default 'public' check (source in ('public', 'internal')),
  branch_id uuid references branches(id),
  reservation_id uuid references reservations(id),
  service_order_id uuid references service_orders(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

create index if not exists idx_customer_reviews_status_created
  on customer_reviews(status, created_at desc);
create index if not exists idx_customer_reviews_branch_status
  on customer_reviews(branch_id, status);

alter table products
  add column if not exists image_path text,
  add column if not exists image_url text;

update products
set category = case
  when lower(coalesce(category, '')) in ('bebidas', 'snacks', 'snack') then 'snack'
  when lower(coalesce(category, '')) in ('productos', 'producto', 'barber_product') then 'barber_product'
  when lower(coalesce(category, '') || ' ' || name) ~ '(gel|cera|crema|shampoo|after shave|barber)' then 'barber_product'
  else coalesce(nullif(category, ''), 'snack')
end;

update products
set counts_for_seller_credit = category = 'barber_product',
    seller_credit_amount = case when category = 'barber_product' then 2 else 0 end;

create table if not exists barber_liquidations (
  id uuid primary key default gen_random_uuid(),
  period_from date not null,
  period_to date not null,
  branch_id uuid references branches(id),
  barber_id uuid references employees(id) not null,
  gross_production numeric(10,2) not null default 0,
  production_deductions numeric(10,2) not null default 0,
  calculated_production numeric(10,2) not null default 0,
  assigned_percentage numeric(5,2) not null default 0,
  service_earnings numeric(10,2) not null default 0,
  product_credits numeric(10,2) not null default 0,
  bonuses numeric(10,2) not null default 0,
  total_liquidation numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  created_by uuid,
  paid_by uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists barber_liquidation_items (
  id uuid primary key default gen_random_uuid(),
  liquidation_id uuid references barber_liquidations(id) on delete cascade not null,
  production_entry_id uuid references barber_production_entries(id),
  item_type text not null,
  description text,
  gross_amount numeric(10,2) not null default 0,
  deduction_amount numeric(10,2) not null default 0,
  production_amount numeric(10,2) not null default 0,
  percentage numeric(5,2) not null default 0,
  earning_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_barber_liquidations_unique_draft_period
  on barber_liquidations(period_from, period_to, barber_id, branch_id, status)
  where status <> 'cancelled';

create index if not exists idx_barber_liquidations_barber_period
  on barber_liquidations(barber_id, period_from, period_to);

drop trigger if exists barber_liquidations_updated_at on barber_liquidations;
create trigger barber_liquidations_updated_at
before update on barber_liquidations
for each row execute function set_updated_at();

alter table customer_reviews enable row level security;
alter table barber_liquidations enable row level security;
alter table barber_liquidation_items enable row level security;

drop policy if exists "customer reviews public insert" on customer_reviews;
create policy "customer reviews public insert" on customer_reviews
for insert
with check (source = 'public' and status = 'pending');

drop policy if exists "customer reviews approved public select" on customer_reviews;
create policy "customer reviews approved public select" on customer_reviews
for select
using (status = 'approved');

drop policy if exists "customer reviews staff manage" on customer_reviews;
create policy "customer reviews staff manage" on customer_reviews
for all
using (
  is_admin()
  or branch_id is null
  or branch_id = current_employee_branch_id()
)
with check (
  is_admin()
  or branch_id is null
  or branch_id = current_employee_branch_id()
);

drop policy if exists "barber liquidations staff select" on barber_liquidations;
create policy "barber liquidations staff select" on barber_liquidations
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or barber_id = current_employee_id()
);

drop policy if exists "barber liquidations admin write" on barber_liquidations;
create policy "barber liquidations admin write" on barber_liquidations
for all
using (is_admin())
with check (is_admin());

drop policy if exists "barber liquidation items staff select" on barber_liquidation_items;
create policy "barber liquidation items staff select" on barber_liquidation_items
for select
using (
  exists (
    select 1 from barber_liquidations bl
    where bl.id = liquidation_id
      and (is_admin() or bl.branch_id = current_employee_branch_id() or bl.barber_id = current_employee_id())
  )
);

drop policy if exists "barber liquidation items admin write" on barber_liquidation_items;
create policy "barber liquidation items admin write" on barber_liquidation_items
for all
using (is_admin())
with check (is_admin());
