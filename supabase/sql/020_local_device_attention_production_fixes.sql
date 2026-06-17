alter type service_order_status add value if not exists 'pendiente_pago';

alter table employees
  add column if not exists can_perform_services boolean not null default false;

update employees
set can_perform_services = true
where role = 'barbero'
  and can_perform_services = false;

alter table service_orders
  add column if not exists service_date date;

update service_orders
set service_date = coalesce(attended_at::date, created_at::date, current_date)
where service_date is null;

alter table service_orders
  alter column service_date set default current_date;

alter table service_orders
  drop constraint if exists service_orders_origin_check;

alter table service_orders
  add constraint service_orders_origin_check
  check (origin in ('walk_in', 'reservation', 'local', 'local_device'));

create index if not exists idx_service_orders_service_date_branch
  on service_orders(service_date, branch_id, status);

create index if not exists idx_service_orders_service_date_employee
  on service_orders(service_date, employee_id, status);

create index if not exists idx_employees_can_perform_services
  on employees(branch_id, can_perform_services, is_active);

create index if not exists idx_local_devices_token_status
  on local_devices(access_token_hash, status);

create index if not exists idx_reservations_branch_status_starts
  on reservations(branch_id, status, starts_at);
