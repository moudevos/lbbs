alter table employees
  add column if not exists onboarding_status text not null default 'active',
  add column if not exists email_confirmed_at timestamptz;

alter table employees
  drop constraint if exists employees_onboarding_status_check;

alter table employees
  add constraint employees_onboarding_status_check
  check (onboarding_status in ('pending_email_verification', 'pending_password_change', 'active'));

update employees
set onboarding_status = case
  when must_change_password then 'pending_password_change'
  else 'active'
end
where onboarding_status is null or onboarding_status = 'active';

create index if not exists idx_employees_onboarding_status on employees(onboarding_status);
create index if not exists idx_employees_email_confirmed_at on employees(email_confirmed_at);

alter table customers
  add column if not exists normalized_phone text;

update customers
set normalized_phone = regexp_replace(coalesce(phone, ''), '\D', '', 'g')
where normalized_phone is null;

create unique index if not exists idx_customers_normalized_phone_unique
  on customers(normalized_phone)
  where normalized_phone is not null and normalized_phone <> '';

create index if not exists idx_customers_branch_normalized_phone
  on customers(branch_id, normalized_phone);

alter table reservations
  add column if not exists visit_counted_at timestamptz;

create index if not exists idx_reservations_visit_counted_at on reservations(visit_counted_at);

create table if not exists customer_visit_stats (
  customer_id uuid primary key references customers(id) on delete cascade,
  total_attended_reservations integer not null default 0,
  total_service_orders integer not null default 0,
  total_visits integer not null default 0,
  last_visit_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_visit_stats_last_visit_at
  on customer_visit_stats(last_visit_at desc);
