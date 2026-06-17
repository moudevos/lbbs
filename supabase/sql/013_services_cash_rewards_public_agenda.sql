alter table service_orders
  add column if not exists service_id uuid references services(id),
  add column if not exists observations text,
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists reward_redemption_id uuid,
  add column if not exists visit_counted_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;

alter table payment_details
  add column if not exists reference text;

create index if not exists idx_service_orders_service_id on service_orders(service_id);
create index if not exists idx_service_orders_created_at on service_orders(created_at desc);
create index if not exists idx_service_orders_visit_counted_at on service_orders(visit_counted_at);
create index if not exists idx_payment_details_method on payment_details(method);

create table if not exists customer_reward_accounts (
  customer_id uuid primary key references customers(id) on delete cascade,
  eligible_visit_count integer not null default 0,
  earned_rewards integer not null default 0,
  redeemed_rewards integer not null default 0,
  available_rewards integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists customer_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  event_type text not null check (event_type in ('visit_counted', 'reward_earned', 'reward_redeemed', 'reward_reversed')),
  reservation_id uuid references reservations(id),
  service_order_id uuid references service_orders(id),
  branch_id uuid references branches(id),
  points_delta integer not null default 0,
  reward_delta integer not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists customer_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  reward_type text not null check (reward_type in ('classic_cut', 'voucher_30')),
  branch_id uuid references branches(id),
  service_order_id uuid references service_orders(id),
  amount_value numeric(10,2) not null default 0,
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid,
  status text not null default 'redeemed' check (status in ('redeemed', 'cancelled'))
);

alter table customer_reward_accounts enable row level security;
alter table customer_reward_ledger enable row level security;
alter table customer_reward_redemptions enable row level security;

drop policy if exists "reward_accounts staff select" on customer_reward_accounts;
create policy "reward_accounts staff select" on customer_reward_accounts
for select
using (
  is_admin()
  or exists (
    select 1 from customers c
    where c.id = customer_id and c.branch_id = current_employee_branch_id()
  )
);

drop policy if exists "reward_accounts staff write" on customer_reward_accounts;
create policy "reward_accounts staff write" on customer_reward_accounts
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role)
with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop policy if exists "reward_ledger staff select" on customer_reward_ledger;
create policy "reward_ledger staff select" on customer_reward_ledger
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or exists (
    select 1 from customers c
    where c.id = customer_id and c.branch_id = current_employee_branch_id()
  )
);

drop policy if exists "reward_ledger staff write" on customer_reward_ledger;
create policy "reward_ledger staff write" on customer_reward_ledger
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role)
with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop policy if exists "reward_redemptions staff select" on customer_reward_redemptions;
create policy "reward_redemptions staff select" on customer_reward_redemptions
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or exists (
    select 1 from customers c
    where c.id = customer_id and c.branch_id = current_employee_branch_id()
  )
);

drop policy if exists "reward_redemptions staff write" on customer_reward_redemptions;
create policy "reward_redemptions staff write" on customer_reward_redemptions
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role)
with check (is_admin() or current_employee_role() = 'recepcion'::app_role);

drop trigger if exists customer_reward_accounts_updated_at on customer_reward_accounts;
create trigger customer_reward_accounts_updated_at
before update on customer_reward_accounts
for each row execute function set_updated_at();
