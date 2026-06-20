-- Habilita tablas operativas en Supabase Realtime de forma idempotente.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'reservations',
    'service_orders',
    'service_order_items',
    'cash_closures',
    'product_branch_stock',
    'notification_events'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      )
    then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
