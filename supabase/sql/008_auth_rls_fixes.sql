create index if not exists employees_user_id_idx on employees(user_id);
create index if not exists employees_branch_id_idx on employees(branch_id);
create index if not exists customers_branch_id_idx on customers(branch_id);
create index if not exists reservations_branch_id_idx on reservations(branch_id);
create index if not exists reservations_employee_id_idx on reservations(employee_id);
create index if not exists service_orders_branch_id_idx on service_orders(branch_id);
create index if not exists service_orders_employee_id_idx on service_orders(employee_id);

create or replace function current_employee_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from employees where user_id = auth.uid() and is_active = true limit 1;
$$;

create or replace function current_employee_role()
returns app_role
language sql
security definer
set search_path = public
as $$
  select role from employees where user_id = auth.uid() and is_active = true limit 1;
$$;

create or replace function current_employee_branch_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select branch_id from employees where user_id = auth.uid() and is_active = true limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select current_employee_role() = 'admin'::app_role;
$$;

drop policy if exists "authenticated read own data" on reservations;

drop policy if exists "employees select by role" on employees;
create policy "employees select by role" on employees
for select
using (
  user_id = auth.uid()
  or is_admin()
  or (current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
);

drop policy if exists "employees admin insert" on employees;
create policy "employees admin insert" on employees
for insert
with check (is_admin());

drop policy if exists "employees admin update" on employees;
create policy "employees admin update" on employees
for update
using (is_admin() or user_id = auth.uid())
with check (is_admin() or user_id = auth.uid());

drop policy if exists "branches select by role" on branches;
create policy "branches select by role" on branches
for select
using (
  is_active = true
  and (
    is_admin()
    or id = current_employee_branch_id()
    or auth.uid() is null
  )
);

drop policy if exists "branches admin write" on branches;
create policy "branches admin write" on branches
for all
using (is_admin())
with check (is_admin());

drop policy if exists "customers select by role" on customers;
create policy "customers select by role" on customers
for select
using (is_admin() or branch_id = current_employee_branch_id());

drop policy if exists "customers write by role" on customers;
create policy "customers write by role" on customers
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
with check (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id());

drop policy if exists "services select by role" on services;
create policy "services select by role" on services
for select
using (
  is_active = true
  and (
    is_admin()
    or branch_id is null
    or branch_id = current_employee_branch_id()
  )
);

drop policy if exists "services write admin" on services;
create policy "services write admin" on services
for all
using (is_admin())
with check (is_admin());

drop policy if exists "reservations select by role" on reservations;
create policy "reservations select by role" on reservations
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or employee_id = current_employee_id()
);

drop policy if exists "reservations write staff" on reservations;
create policy "reservations write staff" on reservations
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
with check (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id());

drop policy if exists "service_orders select by role" on service_orders;
create policy "service_orders select by role" on service_orders
for select
using (
  is_admin()
  or branch_id = current_employee_branch_id()
  or employee_id = current_employee_id()
);

drop policy if exists "service_orders write staff" on service_orders;
create policy "service_orders write staff" on service_orders
for all
using (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id())
with check (is_admin() or current_employee_role() = 'recepcion'::app_role and branch_id = current_employee_branch_id());

drop policy if exists "service_order_items select by role" on service_order_items;
create policy "service_order_items select by role" on service_order_items
for select
using (
  exists (
    select 1 from service_orders so
    where so.id = service_order_id
      and (is_admin() or so.branch_id = current_employee_branch_id() or so.employee_id = current_employee_id())
  )
);

drop policy if exists "payment_details select by role" on payment_details;
create policy "payment_details select by role" on payment_details
for select
using (
  exists (
    select 1 from service_orders so
    where so.id = service_order_id
      and (is_admin() or so.branch_id = current_employee_branch_id())
  )
);

drop policy if exists "payment_details write staff" on payment_details;
create policy "payment_details write staff" on payment_details
for all
using (
  exists (
    select 1 from service_orders so
    where so.id = service_order_id
      and (is_admin() or current_employee_role() = 'recepcion'::app_role and so.branch_id = current_employee_branch_id())
  )
)
with check (
  exists (
    select 1 from service_orders so
    where so.id = service_order_id
      and (is_admin() or current_employee_role() = 'recepcion'::app_role and so.branch_id = current_employee_branch_id())
  )
);

drop policy if exists "whatsapp_templates staff select" on whatsapp_templates;
create policy "whatsapp_templates staff select" on whatsapp_templates
for select
using (auth.uid() is not null and current_employee_role() is not null);

drop policy if exists "whatsapp_templates admin write" on whatsapp_templates;
create policy "whatsapp_templates admin write" on whatsapp_templates
for all
using (is_admin())
with check (is_admin());

drop policy if exists "app_settings staff select" on app_settings;
create policy "app_settings staff select" on app_settings
for select
using (auth.uid() is not null and current_employee_role() is not null);

drop policy if exists "app_settings admin write" on app_settings;
create policy "app_settings admin write" on app_settings
for all
using (is_admin())
with check (is_admin());

drop policy if exists "landing_assets public select" on landing_assets;
create policy "landing_assets public select" on landing_assets
for select
using (is_active = true);

drop policy if exists "landing_assets admin write" on landing_assets;
create policy "landing_assets admin write" on landing_assets
for all
using (is_admin())
with check (is_admin());

drop policy if exists "audit_logs admin select" on audit_logs;
create policy "audit_logs admin select" on audit_logs
for select
using (is_admin());
