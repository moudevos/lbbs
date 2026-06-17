create table if not exists product_branch_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  branch_id uuid references branches(id) not null,
  stock_current integer not null default 0,
  stock_minimum integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, branch_id)
);

alter table product_stock_movements
  add column if not exists movement_kind text,
  add column if not exists quantity integer,
  add column if not exists reference text,
  add column if not exists actor_user_id uuid;

update product_stock_movements
set
  movement_kind = case movement_type
    when 'sale' then 'venta'
    when 'void' then 'anulacion_venta'
    else movement_type
  end,
  quantity = abs(quantity_delta),
  actor_user_id = created_by
where movement_kind is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_stock_movements_kind_check'
  ) then
    alter table product_stock_movements
      add constraint product_stock_movements_kind_check
      check (
        movement_kind is null
        or movement_kind in ('ingreso', 'ajuste_positivo', 'ajuste_negativo', 'venta', 'anulacion_venta')
      );
  end if;
end $$;

insert into product_branch_stock (product_id, branch_id, stock_current, stock_minimum)
select p.id, b.id, coalesce(p.stock_current, 0), coalesce(p.stock_minimum, 0)
from products p
cross join branches b
where p.is_active = true
on conflict (product_id, branch_id) do nothing;

alter table product_branch_stock enable row level security;

drop policy if exists "product_branch_stock staff select" on product_branch_stock;
create policy "product_branch_stock staff select" on product_branch_stock
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
);

drop policy if exists "product_branch_stock staff write" on product_branch_stock;
create policy "product_branch_stock staff write" on product_branch_stock
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
with check (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id());

drop trigger if exists product_branch_stock_updated_at on product_branch_stock;
create trigger product_branch_stock_updated_at
before update on product_branch_stock
for each row execute function set_updated_at();

create index if not exists idx_product_branch_stock_product_id on product_branch_stock(product_id);
create index if not exists idx_product_branch_stock_branch_id on product_branch_stock(branch_id);
create index if not exists idx_product_stock_movements_kind on product_stock_movements(movement_kind);
