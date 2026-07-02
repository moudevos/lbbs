-- Permite asignar una recompensa inicial por migracion de tarjetas fisicas.
-- No cambia la regla operativa: el reward se canjea desde una atencion valida.

alter table public.customer_reward_ledger drop constraint if exists customer_reward_ledger_event_type_check;
alter table public.customer_reward_ledger add constraint customer_reward_ledger_event_type_check
  check (event_type in (
    'visit_counted',
    'reward_earned',
    'reward_applied',
    'reward_redeemed',
    'reward_cancelled',
    'reward_reversed',
    'reward_manual_grant'
  ));

create unique index if not exists customer_reward_manual_grant_once_idx
  on public.customer_reward_ledger(customer_id)
  where event_type = 'reward_manual_grant';
