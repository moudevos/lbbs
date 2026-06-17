alter table barber_liquidations
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists cutoff_at timestamptz;

alter table barber_liquidation_items
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists discount_rule text,
  add column if not exists applied_percentage numeric(5,2);

create table if not exists local_device_tokens (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  name text not null,
  token_hash text not null unique,
  pin_hash text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_local_device_tokens_branch_active
  on local_device_tokens(branch_id, is_active);

drop trigger if exists local_device_tokens_updated_at on local_device_tokens;
create trigger local_device_tokens_updated_at
before update on local_device_tokens
for each row execute function set_updated_at();

alter table local_device_tokens enable row level security;

drop policy if exists "local device tokens admin manage" on local_device_tokens;
create policy "local device tokens admin manage" on local_device_tokens
for all using (is_admin()) with check (is_admin());

do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_event_type' and typarray <> 0) then
    null;
  end if;
exception when others then null;
end $$;

alter table service_orders
  drop constraint if exists service_orders_origin_check;

alter table service_orders
  add constraint service_orders_origin_check
  check (origin in ('walk_in', 'reservation', 'local'));
