alter table public.product_stock_movements
  drop constraint if exists product_stock_movements_movement_type_check;

alter table public.product_stock_movements
  add constraint product_stock_movements_movement_type_check
  check (movement_type in ('sale', 'adjustment', 'void'));

-- Recalcula cabeceras operativas que tengan items para evitar diferencias
-- entre subtotal, descuento y total después de despliegues parciales.
update public.service_orders so
set subtotal = totals.gross,
    discount_amount = totals.discount,
    total = greatest(totals.gross - totals.discount, 0),
    balance = greatest(totals.gross - totals.discount - coalesce(so.total_paid, 0), 0)
from (
  select
    service_order_id,
    round(sum(
      case
        when original_unit_price is not null then original_unit_price * quantity
        else subtotal
      end
    )::numeric, 2) as gross,
    round(sum(coalesce(discount_amount, 0))::numeric, 2) as discount
  from public.service_order_items
  where item_type <> 'reward_discount'
  group by service_order_id
) totals
where totals.service_order_id = so.id;
