-- RESET DE DATOS OPERATIVOS PARA PRUEBAS.
-- Conserva: servicios, productos, clientes, usuarios/empleados, sedes,
-- galeria/landing, resenas, configuracion y catalogos.
-- Para ejecutar deliberadamente:
--   set app.lbbs_reset_confirmation = 'RESET_LBBS_OPERATIONAL_DATA';
--   luego ejecutar este archivo en la misma sesion.

do $$
begin
  if current_setting('app.lbbs_reset_confirmation', true) <> 'RESET_LBBS_OPERATIONAL_DATA' then
    raise exception 'Reset bloqueado. Configura app.lbbs_reset_confirmation antes de ejecutar.';
  end if;
end
$$;

truncate table
  public.payment_details,
  public.service_order_items,
  public.customer_reward_redemptions,
  public.customer_reward_ledger,
  public.barber_production_entries,
  public.product_stock_movements,
  public.cash_closure_items,
  public.cash_closures,
  public.reservation_reminders,
  public.notification_events,
  public.push_subscriptions,
  public.audit_logs,
  public.service_orders,
  public.reservations
restart identity cascade;

update public.customer_reward_accounts
set eligible_visit_count = 0,
    earned_rewards = 0,
    redeemed_rewards = 0,
    available_rewards = 0,
    updated_at = now();

update public.customer_visit_stats
set total_attended_reservations = 0,
    total_service_orders = 0,
    total_visits = 0,
    last_visit_at = null,
    updated_at = now();

update public.product_branch_stock pbs
set stock_current = coalesce(p.stock_current, pbs.stock_current),
    updated_at = now()
from public.products p
where p.id = pbs.product_id;
