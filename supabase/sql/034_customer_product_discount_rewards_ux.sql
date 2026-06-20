alter table public.service_order_items
  add column if not exists original_unit_price numeric(10,2),
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists discount_rule text;

insert into public.app_settings (key, value)
values
  ('customer_product_discount_enabled', 'true'::jsonb),
  ('customer_product_discount_min_visits', '2'::jsonb),
  ('customer_product_discount_percent', '10'::jsonb),
  ('customer_product_discount_product_category', '"barber_product"'::jsonb)
on conflict (key) do nothing;
