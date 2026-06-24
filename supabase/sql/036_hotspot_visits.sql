-- Portal externo MikroTik Hotspot: visitas y consentimientos.
-- Idempotente: puede ejecutarse varias veces sin duplicar objetos.

alter table public.customers
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists terms_accepted_at timestamptz;

create table if not exists public.hotspot_visits (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_id uuid references public.customers(id),
  customer_name text not null,
  phone text not null,
  accepted_terms boolean not null default false,
  accepted_marketing boolean not null default false,
  source text not null default 'mikrotik_hotspot',
  mac_address text,
  ip_address text,
  mikrotik_username text,
  user_agent text,
  visit_date date not null default ((now() at time zone 'America/Lima')::date),
  visited_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_hotspot_visits_branch_date
  on public.hotspot_visits(branch_id, visit_date desc);

create index if not exists idx_hotspot_visits_phone
  on public.hotspot_visits(phone);

create index if not exists idx_hotspot_visits_customer
  on public.hotspot_visits(customer_id);

create index if not exists idx_hotspot_visits_visited_at
  on public.hotspot_visits(visited_at desc);

alter table public.hotspot_visits enable row level security;

drop policy if exists "hotspot visits select by role" on public.hotspot_visits;
create policy "hotspot visits select by role" on public.hotspot_visits
for select using (
  exists (
    select 1
    from public.employees e
    where e.user_id = auth.uid()
      and e.is_active = true
      and (
        e.role = 'admin'
        or (e.role = 'recepcion' and e.branch_id = hotspot_visits.branch_id)
      )
  )
);

drop policy if exists "hotspot visits write by service role only" on public.hotspot_visits;
create policy "hotspot visits write by service role only" on public.hotspot_visits
for all using (false) with check (false);

do $$
begin
  if to_regprocedure('public.create_operational_notification(uuid,text,text,text,text,uuid,text,jsonb)') is not null then
    raise notice 'create_operational_notification available for hotspot API.';
  end if;
end $$;
