alter table public.products
  add column if not exists cost_price numeric(10,2) not null default 0;

update public.products
set cost_price = coalesce(cost, 0)
where cost_price = 0 and cost is not null;

insert into public.app_settings (key, value)
values
  ('employee_benefits_free_haircuts_per_month', '1'::jsonb),
  ('employee_benefits_cafeteria_discount_amount', '2'::jsonb),
  ('employee_benefits_barber_product_price_mode', '"cost"'::jsonb),
  ('employee_benefits_allow_credit', 'true'::jsonb)
on conflict (key) do nothing;

create table if not exists public.employee_benefit_movements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  branch_id uuid references public.branches(id),
  created_by uuid references public.employees(id),
  movement_type text not null check (movement_type in (
    'free_haircut', 'cafeteria_cash', 'cafeteria_credit',
    'barber_product_cash', 'barber_product_credit',
    'salary_advance', 'manual_deduction', 'manual_adjustment', 'reversal'
  )),
  status text not null default 'active' check (status in ('active', 'reversed', 'liquidated', 'cancelled')),
  benefit_month date not null,
  product_id uuid references public.products(id),
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  payment_mode text,
  payment_method text,
  stock_movement_id uuid references public.product_stock_movements(id),
  related_cash_id uuid,
  related_liquidation_id uuid references public.barber_liquidations(id),
  notes text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  reversed_at timestamptz,
  reversed_by uuid references public.employees(id),
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_employee_benefit_free_haircut_month
  on public.employee_benefit_movements(employee_id, benefit_month, movement_type)
  where movement_type = 'free_haircut' and status = 'active';
create index if not exists idx_employee_benefits_month on public.employee_benefit_movements(benefit_month);
create index if not exists idx_employee_benefits_employee on public.employee_benefit_movements(employee_id, created_at desc);
create index if not exists idx_employee_benefits_branch on public.employee_benefit_movements(branch_id, created_at desc);
create index if not exists idx_employee_benefits_liquidation on public.employee_benefit_movements(related_liquidation_id);

drop trigger if exists employee_benefit_movements_updated_at on public.employee_benefit_movements;
create trigger employee_benefit_movements_updated_at
before update on public.employee_benefit_movements
for each row execute function public.set_updated_at();

alter table public.employee_benefit_movements enable row level security;

drop policy if exists "employee benefits staff select" on public.employee_benefit_movements;
create policy "employee benefits staff select" on public.employee_benefit_movements
for select using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or employee_id = current_employee_id()
);

drop policy if exists "employee benefits admin manage" on public.employee_benefit_movements;
create policy "employee benefits admin manage" on public.employee_benefit_movements
for all using (is_admin()) with check (is_admin());

drop policy if exists "employee benefits reception insert" on public.employee_benefit_movements;
create policy "employee benefits reception insert" on public.employee_benefit_movements
for insert with check (
  current_employee_role() = 'recepcion'::app_role
  and branch_id = current_employee_branch_id()
  and movement_type in ('free_haircut', 'cafeteria_cash', 'barber_product_cash')
);

drop policy if exists "employee benefits barber insert" on public.employee_benefit_movements;
create policy "employee benefits barber insert" on public.employee_benefit_movements
for insert with check (
  current_employee_role() = 'barbero'::app_role
  and employee_id = current_employee_id()
  and movement_type = 'free_haircut'
);
