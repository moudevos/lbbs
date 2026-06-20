-- TK-001..004: cierres de caja, cortesias, push y recordatorios.
alter table reservations add column if not exists contacted_at timestamptz;
alter table services
  add column if not exists allow_manual_price boolean not null default false,
  add column if not exists is_custom_service boolean not null default false;

insert into services (sku, name, description, duration_minutes, price, branch_id, is_active, allow_manual_price, is_custom_service)
values ('CUSTOM', 'Personalizado', 'Servicio personalizado con descripcion y precio definidos al registrar la atencion.', 60, 0, null, true, true, true)
on conflict (sku) do update set
  name = excluded.name,
  is_active = true,
  allow_manual_price = true,
  is_custom_service = true,
  branch_id = null;

insert into app_settings (key, value)
values ('reward_count_mode', '"per_order"'::jsonb)
on conflict (key) do nothing;

create table if not exists cash_closures (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  closure_date date not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references employees(id),
  reopened_at timestamptz,
  reopened_by uuid references employees(id),
  status text not null default 'open' check (status in ('open', 'closed', 'reopened', 'cancelled')),
  expected_cash numeric(10,2) not null default 0,
  counted_cash numeric(10,2) not null default 0,
  difference numeric(10,2) not null default 0,
  total_paid numeric(10,2) not null default 0,
  total_voided numeric(10,2) not null default 0,
  total_by_method jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, closure_date)
);

create table if not exists cash_closure_items (
  id uuid primary key default gen_random_uuid(),
  cash_closure_id uuid not null references cash_closures(id) on delete cascade,
  service_order_id uuid not null references service_orders(id),
  amount numeric(10,2) not null default 0,
  status text not null,
  payment_method text,
  included_in_total boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cash_closure_id, service_order_id, payment_method)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  device_id uuid,
  branch_id uuid references branches(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  target_type text,
  target_id uuid,
  type text not null,
  title text not null,
  body text not null,
  url text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reservation_reminders (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  branch_id uuid not null references branches(id),
  remind_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (reservation_id)
);

alter table service_order_items
  add column if not exists parent_service_item_id uuid references service_order_items(id) on delete cascade,
  add column if not exists courtesy_type text,
  add column if not exists stock_controlled boolean not null default false;

do $$
begin
  alter table service_order_items drop constraint if exists service_order_items_item_type_check;
  alter table service_order_items add constraint service_order_items_item_type_check
    check (item_type in ('service', 'custom_service', 'product', 'snack', 'courtesy', 'manual_extra', 'reward_discount'));
end $$;

alter table cash_closures enable row level security;
alter table cash_closure_items enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_events enable row level security;
alter table reservation_reminders enable row level security;

create policy "cash closures staff select" on cash_closures for select
using (is_admin() or branch_id = current_employee_branch_id());
create policy "cash closures reception write" on cash_closures for all
using (is_admin() or (current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id()))
with check (is_admin() or (current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id()));
create policy "cash closure items staff select" on cash_closure_items for select
using (exists (select 1 from cash_closures c where c.id = cash_closure_id and (is_admin() or c.branch_id = current_employee_branch_id())));
create policy "push subscriptions own branch" on push_subscriptions for select
using (is_admin() or branch_id = current_employee_branch_id());
create policy "notification events own branch" on notification_events for select
using (is_admin() or branch_id = current_employee_branch_id());
create policy "reminders own branch" on reservation_reminders for select
using (is_admin() or branch_id = current_employee_branch_id());

create index if not exists idx_cash_closures_branch_date on cash_closures(branch_id, closure_date);
create index if not exists idx_service_orders_active_metrics on service_orders(branch_id, service_date, employee_id) where status <> 'anulado';
create index if not exists idx_reservations_branch_status_starts on reservations(branch_id, status, starts_at);
create index if not exists idx_reservation_reminders_pending on reservation_reminders(status, remind_at) where sent_at is null;
create index if not exists idx_notification_events_branch_created on notification_events(branch_id, created_at desc);
create index if not exists idx_push_subscriptions_branch_active on push_subscriptions(branch_id, active);

drop trigger if exists cash_closures_updated_at on cash_closures;
create trigger cash_closures_updated_at before update on cash_closures
for each row execute function set_updated_at();
