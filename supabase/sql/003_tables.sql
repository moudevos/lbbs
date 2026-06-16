create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  user_id uuid unique,
  branch_id uuid references branches(id),
  role app_role not null,
  first_name text not null,
  last_name text not null,
  phone text,
  email citext,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text not null,
  notes text,
  branch_id uuid references branches(id),
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  duration_minutes integer not null,
  price numeric(10,2),
  branch_id uuid references branches(id),
  image_path text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  customer_id uuid references customers(id) not null,
  service_id uuid references services(id),
  employee_id uuid references employees(id),
  status reservation_status not null default 'pendiente',
  source text not null default 'publico',
  price numeric(10,2),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  observations text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  reservation_id uuid references reservations(id),
  employee_id uuid references employees(id),
  customer_id uuid references customers(id),
  status service_order_status not null default 'registrado',
  total numeric(10,2) not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid references service_orders(id) not null,
  name text not null,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payment_details (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid references service_orders(id) not null,
  method payment_method not null,
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists landing_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  path text not null,
  title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role app_role,
  actor_branch_id uuid,
  event_type audit_event_type not null,
  table_name text not null,
  record_id uuid,
  previous_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
