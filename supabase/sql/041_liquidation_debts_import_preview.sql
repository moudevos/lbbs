alter table public.service_orders
  add column if not exists liquidation_id uuid references public.barber_liquidations(id);

alter table public.service_order_items
  add column if not exists liquidation_id uuid references public.barber_liquidations(id);

alter table public.employee_benefit_movements
  add column if not exists liquidation_id uuid references public.barber_liquidations(id),
  add column if not exists liquidated_at timestamptz,
  add column if not exists applied_amount numeric(10,2) not null default 0,
  add column if not exists pending_amount numeric(10,2) generated always as (greatest(total_amount - applied_amount, 0)) stored;

alter table public.barber_liquidations
  add column if not exists period_start timestamptz,
  add column if not exists period_end timestamptz,
  add column if not exists service_commission numeric(10,2) not null default 0,
  add column if not exists product_incentives numeric(10,2) not null default 0,
  add column if not exists cafeteria_debt_total numeric(10,2) not null default 0,
  add column if not exists cafeteria_debt_applied numeric(10,2) not null default 0,
  add column if not exists product_debt_total numeric(10,2) not null default 0,
  add column if not exists product_debt_applied numeric(10,2) not null default 0,
  add column if not exists manual_deduction_total numeric(10,2) not null default 0,
  add column if not exists manual_deduction_applied numeric(10,2) not null default 0,
  add column if not exists net_to_pay numeric(10,2) not null default 0;

insert into public.app_settings (key, value)
values
  ('employee_benefits_barber_product_price_mode', '"cost_plus_fixed"'::jsonb),
  ('employee_benefits_barber_product_markup_amount', '2'::jsonb),
  ('employee_benefits_haircut_discount_percent', '50'::jsonb)
on conflict (key) do update set value = excluded.value;

create index if not exists idx_service_orders_liquidation on public.service_orders(liquidation_id);
create index if not exists idx_service_order_items_liquidation on public.service_order_items(liquidation_id);
create index if not exists idx_employee_benefits_debt_state
  on public.employee_benefit_movements(employee_id, status, payment_mode, liquidated_at, created_at desc);
