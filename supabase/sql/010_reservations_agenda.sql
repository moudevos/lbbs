create table if not exists branch_schedules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, day_of_week)
);

create table if not exists employee_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, day_of_week)
);

alter table branch_schedules enable row level security;
alter table employee_schedules enable row level security;

drop policy if exists "branch_schedules staff select" on branch_schedules;
create policy "branch_schedules staff select" on branch_schedules
for select
using (
  auth.uid() is null
  or is_admin()
  or branch_id = current_employee_branch_id()
);

drop policy if exists "branch_schedules admin write" on branch_schedules;
create policy "branch_schedules admin write" on branch_schedules
for all
using (is_admin())
with check (is_admin());

drop policy if exists "employee_schedules staff select" on employee_schedules;
create policy "employee_schedules staff select" on employee_schedules
for select
using (
  is_admin()
  or employee_id = current_employee_id()
  or exists (
    select 1 from employees e
    where e.id = employee_id and e.branch_id = current_employee_branch_id()
  )
);

drop policy if exists "employee_schedules admin write" on employee_schedules;
create policy "employee_schedules admin write" on employee_schedules
for all
using (is_admin())
with check (is_admin());

create trigger branch_schedules_updated_at before update on branch_schedules for each row execute function set_updated_at();
create trigger employee_schedules_updated_at before update on employee_schedules for each row execute function set_updated_at();

insert into branch_schedules (branch_id, day_of_week, opens_at, closes_at)
select b.id, d.day_of_week, '09:00'::time, '18:00'::time
from branches b
cross join generate_series(1, 6) as d(day_of_week)
where b.is_active = true
on conflict (branch_id, day_of_week) do nothing;
