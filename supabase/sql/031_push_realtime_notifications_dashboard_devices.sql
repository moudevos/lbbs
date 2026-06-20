create extension if not exists pgcrypto;

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id),
  employee_id uuid references public.employees(id),
  device_id uuid,
  target_type text,
  target_id uuid,
  type text not null,
  title text not null,
  body text not null,
  url text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notification_events add column if not exists employee_id uuid references public.employees(id);
alter table public.notification_events add column if not exists device_id uuid;
alter table public.notification_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notification_events add column if not exists dismissed_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id),
  device_id uuid,
  branch_id uuid references public.branches(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  client_type text not null default 'dashboard',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists device_id uuid;
alter table public.push_subscriptions add column if not exists client_type text not null default 'dashboard';
alter table public.push_subscriptions drop constraint if exists push_subscriptions_client_type_check;
alter table public.push_subscriptions add constraint push_subscriptions_client_type_check
  check (client_type in ('dashboard', 'local_device'));

create index if not exists idx_notification_events_active_branch
  on public.notification_events(branch_id, created_at desc) where dismissed_at is null;
create index if not exists idx_push_subscriptions_branch_active
  on public.push_subscriptions(branch_id, active, client_type);

create or replace function public.create_operational_notification(
  p_branch_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_url text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_id uuid;
  v_message jsonb;
begin
  insert into public.notification_events (
    branch_id, employee_id, device_id, type, title, body, target_type, target_id, url, payload, sent_at
  ) values (
    p_branch_id,
    nullif(p_payload->>'employee_id', '')::uuid,
    nullif(p_payload->>'device_id', '')::uuid,
    p_type, p_title, p_body, p_target_type, p_target_id, p_url,
    coalesce(p_payload, '{}'::jsonb), now()
  ) returning id into v_id;

  v_message := jsonb_build_object(
    'id', v_id, 'branch_id', p_branch_id, 'type', p_type, 'title', p_title,
    'body', p_body, 'target_type', p_target_type, 'target_id', p_target_id,
    'url', p_url, 'payload', coalesce(p_payload, '{}'::jsonb), 'created_at', now()
  );
  perform realtime.send(v_message, p_type, 'branch:' || p_branch_id::text, true);
  perform realtime.send(v_message, p_type, 'branch:' || p_branch_id::text || ':devices', false);
  return v_id;
end;
$$;

grant execute on function public.create_operational_notification(uuid,text,text,text,text,uuid,text,jsonb) to authenticated;
