alter table public.customer_reward_ledger
  add column if not exists cycle_number integer not null default 1,
  add column if not exists created_by uuid;

alter table public.customer_reward_redemptions
  add column if not exists barber_id uuid references public.employees(id),
  add column if not exists reward_value numeric(12,2) not null default 0,
  add column if not exists barber_fixed_earning numeric(12,2) not null default 10,
  add column if not exists cancelled_at timestamptz,
  add column if not exists created_by uuid;

alter table public.customer_reward_redemptions drop constraint if exists customer_reward_redemptions_reward_type_check;
alter table public.customer_reward_redemptions add constraint customer_reward_redemptions_reward_type_check
  check (reward_type in ('classic_cut', 'classic_cut_free'));

alter table public.customer_reward_redemptions drop constraint if exists customer_reward_redemptions_status_check;
alter table public.customer_reward_redemptions add constraint customer_reward_redemptions_status_check
  check (status in ('pending', 'applied', 'redeemed', 'cancelled', 'reversed'));

alter table public.customer_reward_ledger drop constraint if exists customer_reward_ledger_event_type_check;
alter table public.customer_reward_ledger add constraint customer_reward_ledger_event_type_check
  check (event_type in ('visit_counted', 'reward_earned', 'reward_applied', 'reward_redeemed', 'reward_cancelled', 'reward_reversed'));

alter type public.payment_method add value if not exists 'reward';

alter table public.barber_production_entries drop constraint if exists barber_production_entries_type_check;
alter table public.barber_production_entries add constraint barber_production_entries_type_check
  check (entry_type in ('service', 'product_credit', 'reward_classic_cut', 'bonus', 'adjustment', 'reversal'));

create unique index if not exists reward_redemptions_active_order_idx
  on public.customer_reward_redemptions(service_order_id)
  where status in ('pending', 'applied', 'redeemed');

create index if not exists reward_redemptions_metrics_idx
  on public.customer_reward_redemptions(status, branch_id, barber_id, redeemed_at);
