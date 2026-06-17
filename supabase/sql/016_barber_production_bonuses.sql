alter table products
  add column if not exists counts_for_seller_credit boolean not null default false,
  add column if not exists seller_credit_amount numeric(10,2) not null default 2;

alter table service_order_items
  add column if not exists sold_by_employee_id uuid references employees(id),
  add column if not exists seller_credit_amount numeric(10,2) not null default 0,
  add column if not exists counts_for_seller_credit boolean not null default false;

create table if not exists barber_production_settings (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references employees(id) not null,
  percentage numeric(5,2) not null default 50 check (percentage >= 0 and percentage <= 100),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists bonus_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10,2) not null default 0,
  period text not null default 'mensual',
  target_type text not null default 'production_amount',
  target_amount numeric(10,2),
  target_count integer,
  branch_id uuid references branches(id),
  applies_all_barbers boolean not null default true,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bonus_config_services (
  id uuid primary key default gen_random_uuid(),
  bonus_config_id uuid references bonus_configs(id) on delete cascade not null,
  service_id uuid references services(id) not null,
  unique (bonus_config_id, service_id)
);

create table if not exists bonus_config_barbers (
  id uuid primary key default gen_random_uuid(),
  bonus_config_id uuid references bonus_configs(id) on delete cascade not null,
  barber_id uuid references employees(id) not null,
  unique (bonus_config_id, barber_id)
);

create table if not exists barber_bonus_results (
  id uuid primary key default gen_random_uuid(),
  bonus_config_id uuid references bonus_configs(id) not null,
  barber_id uuid references employees(id) not null,
  branch_id uuid references branches(id),
  period_start date not null,
  period_end date not null,
  production_amount numeric(10,2) not null default 0,
  service_count integer not null default 0,
  bonus_amount numeric(10,2) not null default 0,
  achieved boolean not null default false,
  calculated_at timestamptz not null default now(),
  unique (bonus_config_id, barber_id, period_start, period_end)
);

create table if not exists barber_production_entries (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid references service_orders(id),
  service_order_item_id uuid references service_order_items(id),
  reservation_id uuid references reservations(id),
  branch_id uuid references branches(id) not null,
  barber_id uuid references employees(id),
  service_id uuid references services(id),
  customer_id uuid references customers(id),
  entry_type text not null,
  gross_amount numeric(10,2) not null default 0,
  deduction_amount numeric(10,2) not null default 0,
  production_amount numeric(10,2) not null default 0,
  percentage numeric(5,2) not null default 0,
  barber_earning numeric(10,2) not null default 0,
  sold_by_employee_id uuid references employees(id),
  product_id uuid references products(id),
  quantity numeric(10,2) not null default 1,
  description text,
  counted_at timestamptz not null default now(),
  voided_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table barber_production_entries
  alter column service_order_id drop not null,
  add column if not exists service_id uuid references services(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bonus_configs_period_check') then
    alter table bonus_configs add constraint bonus_configs_period_check check (period in ('diario', 'semanal', 'mensual'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bonus_configs_target_type_check') then
    alter table bonus_configs add constraint bonus_configs_target_type_check check (target_type in ('production_amount', 'service_count'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'barber_production_entries_type_check') then
    alter table barber_production_entries add constraint barber_production_entries_type_check check (entry_type in ('service', 'product_credit', 'bonus', 'adjustment', 'reversal'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'barber_production_entries_unique_item_active') then
    alter table barber_production_entries
      add constraint barber_production_entries_unique_item_active unique (service_order_item_id, entry_type);
  end if;
end $$;

alter table barber_production_settings enable row level security;
alter table bonus_configs enable row level security;
alter table bonus_config_services enable row level security;
alter table bonus_config_barbers enable row level security;
alter table barber_bonus_results enable row level security;
alter table barber_production_entries enable row level security;

drop policy if exists "barber production settings staff select" on barber_production_settings;
create policy "barber production settings staff select" on barber_production_settings
for select using (is_admin() or barber_id = current_employee_id());

drop policy if exists "barber production settings admin write" on barber_production_settings;
create policy "barber production settings admin write" on barber_production_settings
for all using (is_admin()) with check (is_admin());

drop policy if exists "bonus configs staff select" on bonus_configs;
create policy "bonus configs staff select" on bonus_configs
for select using (is_admin() or branch_id is null or branch_id = current_employee_branch_id());

drop policy if exists "bonus configs admin write" on bonus_configs;
create policy "bonus configs admin write" on bonus_configs
for all using (is_admin()) with check (is_admin());

drop policy if exists "bonus config services staff select" on bonus_config_services;
create policy "bonus config services staff select" on bonus_config_services
for select using (is_admin() or true);

drop policy if exists "bonus config services admin write" on bonus_config_services;
create policy "bonus config services admin write" on bonus_config_services
for all using (is_admin()) with check (is_admin());

drop policy if exists "bonus config barbers staff select" on bonus_config_barbers;
create policy "bonus config barbers staff select" on bonus_config_barbers
for select using (is_admin() or barber_id = current_employee_id());

drop policy if exists "bonus config barbers admin write" on bonus_config_barbers;
create policy "bonus config barbers admin write" on bonus_config_barbers
for all using (is_admin()) with check (is_admin());

drop policy if exists "barber bonus results staff select" on barber_bonus_results;
create policy "barber bonus results staff select" on barber_bonus_results
for select using (is_admin() or branch_id = current_employee_branch_id() or barber_id = current_employee_id());

drop policy if exists "barber bonus results admin write" on barber_bonus_results;
create policy "barber bonus results admin write" on barber_bonus_results
for all using (is_admin()) with check (is_admin());

drop policy if exists "barber production entries staff select" on barber_production_entries;
create policy "barber production entries staff select" on barber_production_entries
for select using (is_admin() or branch_id = current_employee_branch_id() or barber_id = current_employee_id() or sold_by_employee_id = current_employee_id());

drop policy if exists "barber production entries staff insert" on barber_production_entries;
create policy "barber production entries staff insert" on barber_production_entries
for insert with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop policy if exists "barber production entries staff update" on barber_production_entries;
create policy "barber production entries staff update" on barber_production_entries
for update using (is_admin() or current_employee_role() = 'recepcion'::app_role)
with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop trigger if exists bonus_configs_updated_at on bonus_configs;
create trigger bonus_configs_updated_at
before update on bonus_configs
for each row execute function set_updated_at();

create index if not exists idx_barber_production_settings_barber on barber_production_settings(barber_id, is_active, effective_from desc);
create index if not exists idx_bonus_configs_active on bonus_configs(is_active, period);
create index if not exists idx_bonus_config_services_bonus on bonus_config_services(bonus_config_id);
create index if not exists idx_bonus_config_barbers_bonus on bonus_config_barbers(bonus_config_id);
create index if not exists idx_barber_bonus_results_barber_period on barber_bonus_results(barber_id, period_start, period_end);
create index if not exists idx_barber_production_entries_counted_at on barber_production_entries(counted_at desc);
create index if not exists idx_barber_production_entries_barber on barber_production_entries(barber_id);
create index if not exists idx_barber_production_entries_seller on barber_production_entries(sold_by_employee_id);
create index if not exists idx_barber_production_entries_branch on barber_production_entries(branch_id);
create index if not exists idx_barber_production_entries_service on barber_production_entries(service_id);

update products
set counts_for_seller_credit = true,
    seller_credit_amount = 2
where lower(coalesce(category, '') || ' ' || name) ~ '(gel|cera|crema|shampoo|after shave|cuidado|barber)';
