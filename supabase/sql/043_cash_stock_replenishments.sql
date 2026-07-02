alter table public.product_stock_movements
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
      'anulacion_reposicion_caja'
    )
  );

create table if not exists public.cash_operational_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  movement_type text not null,
  direction text not null,
  amount numeric(10,2) not null,
  payment_method text not null,
  status text not null default 'active',
  description text not null,
  responsible_employee_id uuid references public.employees(id),
  created_by uuid,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  related_product_id uuid references public.products(id),
  related_stock_movement_id uuid references public.product_stock_movements(id),
  related_cash_closure_id uuid references public.cash_closures(id),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_operational_movements_movement_type_check check (movement_type in ('stock_replenishment')),
  constraint cash_operational_movements_direction_check check (direction in ('in', 'out')),
  constraint cash_operational_movements_status_check check (status in ('active', 'voided')),
  constraint cash_operational_movements_amount_check check (amount > 0),
  constraint cash_operational_movements_payment_method_check check (payment_method in ('efectivo', 'tarjeta', 'qr', 'transferencia'))
);

alter table public.cash_operational_movements enable row level security;

drop policy if exists "cash operational movements staff select" on public.cash_operational_movements;
create policy "cash operational movements staff select" on public.cash_operational_movements
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
);

drop policy if exists "cash operational movements reception insert" on public.cash_operational_movements;
create policy "cash operational movements reception insert" on public.cash_operational_movements
for insert
with check (
  is_admin()
  or (current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
);

drop policy if exists "cash operational movements admin update" on public.cash_operational_movements;
create policy "cash operational movements admin update" on public.cash_operational_movements
for update
using (is_admin())
with check (is_admin());

drop trigger if exists cash_operational_movements_updated_at on public.cash_operational_movements;
create trigger cash_operational_movements_updated_at
before update on public.cash_operational_movements
for each row execute function public.set_updated_at();

create index if not exists idx_cash_operational_movements_branch_date
  on public.cash_operational_movements(branch_id, occurred_at desc);
create index if not exists idx_cash_operational_movements_status
  on public.cash_operational_movements(status);
create index if not exists idx_cash_operational_movements_type
  on public.cash_operational_movements(movement_type);
create index if not exists idx_cash_operational_movements_product
  on public.cash_operational_movements(related_product_id);
create index if not exists idx_product_stock_movements_metadata_gin
  on public.product_stock_movements using gin (metadata);
