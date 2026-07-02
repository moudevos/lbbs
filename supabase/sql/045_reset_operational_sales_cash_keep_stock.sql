-- RESET OPERATIVO SEGURO PARA PRUEBAS.
--
-- Limpia ventas, atenciones, reservas, caja, salidas operativas,
-- liquidaciones, beneficios/deudas, rewards derivados, notificaciones y auditoria.
--
-- Conserva:
-- - productos
-- - stock actual por producto/sede
-- - clientes
-- - empleados/usuarios
-- - sedes
-- - servicios
-- - resenas
-- - galeria/landing/configuracion
-- - dispositivos y suscripciones push
--
-- IMPORTANTE:
-- Conserva el stock actual como esta, pero limpia el kardex:
-- public.product_stock_movements.
--
-- Para ejecutar deliberadamente en Supabase SQL Editor:
--   set app.lbbs_reset_confirmation = 'RESET_LBBS_OPERATIONAL_KEEP_STOCK';
--   luego ejecutar este archivo completo en la misma sesion.

begin;

do $$
begin
  if current_setting('app.lbbs_reset_confirmation', true) <> 'RESET_LBBS_OPERATIONAL_KEEP_STOCK' then
    raise exception 'Reset bloqueado. Ejecuta primero: set app.lbbs_reset_confirmation = ''RESET_LBBS_OPERATIONAL_KEEP_STOCK'';';
  end if;
end
$$;

-- Desacoplar resenas que se deben conservar antes de borrar ventas/reservas.
do $$
begin
  if to_regclass('public.customer_reviews') is not null then
    update public.customer_reviews
    set reservation_id = null,
        service_order_id = null
    where reservation_id is not null
       or service_order_id is not null;
  end if;
end
$$;

-- Limpiar datos operativos dependientes.
do $$
begin
  if to_regclass('public.cash_closure_items') is not null then
    delete from public.cash_closure_items;
  end if;

  if to_regclass('public.payment_details') is not null then
    delete from public.payment_details;
  end if;

  if to_regclass('public.customer_reward_redemptions') is not null then
    delete from public.customer_reward_redemptions;
  end if;

  if to_regclass('public.customer_reward_ledger') is not null then
    delete from public.customer_reward_ledger;
  end if;

  if to_regclass('public.barber_liquidation_items') is not null then
    delete from public.barber_liquidation_items;
  end if;

  if to_regclass('public.barber_bonus_results') is not null then
    delete from public.barber_bonus_results;
  end if;

  if to_regclass('public.barber_production_entries') is not null then
    delete from public.barber_production_entries;
  end if;

  if to_regclass('public.employee_benefit_movements') is not null then
    delete from public.employee_benefit_movements;
  end if;

  if to_regclass('public.cash_operational_movements') is not null then
    delete from public.cash_operational_movements;
  end if;

  if to_regclass('public.product_stock_movements') is not null then
    delete from public.product_stock_movements;
  end if;

  if to_regclass('public.reservation_reminders') is not null then
    delete from public.reservation_reminders;
  end if;

  if to_regclass('public.notification_events') is not null then
    delete from public.notification_events;
  end if;

  if to_regclass('public.audit_logs') is not null then
    delete from public.audit_logs;
  end if;

  if to_regclass('public.service_order_items') is not null then
    delete from public.service_order_items;
  end if;

  if to_regclass('public.service_orders') is not null then
    delete from public.service_orders;
  end if;

  if to_regclass('public.reservations') is not null then
    delete from public.reservations;
  end if;

  if to_regclass('public.cash_closures') is not null then
    delete from public.cash_closures;
  end if;

  if to_regclass('public.barber_liquidations') is not null then
    delete from public.barber_liquidations;
  end if;
end
$$;

-- Resetear acumulados derivados sin tocar clientes.
do $$
begin
  if to_regclass('public.customer_reward_accounts') is not null then
    update public.customer_reward_accounts
    set eligible_visit_count = 0,
        earned_rewards = 0,
        redeemed_rewards = 0,
        available_rewards = 0,
        updated_at = now();
  end if;

  if to_regclass('public.customer_visit_stats') is not null then
    update public.customer_visit_stats
    set total_attended_reservations = 0,
        total_service_orders = 0,
        total_visits = 0,
        last_visit_at = null,
        updated_at = now();
  end if;
end
$$;

commit;

-- Verificacion rapida opcional:
-- select count(*) as service_orders from public.service_orders;
-- select count(*) as reservations from public.reservations;
-- select count(*) as stock_kardex_cleaned from public.product_stock_movements;
-- select count(*) as products_kept from public.products;
-- select count(*) as branch_stock_kept from public.product_branch_stock;
