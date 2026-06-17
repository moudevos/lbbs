create table if not exists local_devices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  device_name text not null,
  device_code text unique not null,
  access_token_hash text not null unique,
  pin_hash text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_local_devices_branch_status
  on local_devices(branch_id, status);

drop trigger if exists local_devices_updated_at on local_devices;
create trigger local_devices_updated_at
before update on local_devices
for each row execute function set_updated_at();

alter table local_devices enable row level security;

drop policy if exists "local devices staff select" on local_devices;
create policy "local devices staff select" on local_devices
for select using (
  is_admin()
  or branch_id = current_employee_branch_id()
);

drop policy if exists "local devices admin write" on local_devices;
create policy "local devices admin write" on local_devices
for all using (is_admin())
with check (is_admin());

alter type service_order_status add value if not exists 'pendiente_pago';

-- No recrear un CHECK que use 'pendiente_pago' en este mismo script.
-- Supabase SQL Editor ejecuta el archivo en una transaccion y PostgreSQL no permite
-- usar un valor nuevo de enum hasta que el ALTER TYPE haya sido confirmado.
-- Si service_orders.status es service_order_status, el enum ya valida los estados.
