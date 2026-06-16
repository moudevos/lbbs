create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function next_code(prefix text, digits int) returns text language plpgsql as $$
declare
  n int;
begin
  execute format('select coalesce(max((regexp_replace(code, ''\\D'', '''', ''g''))::int), 0) + 1 from %I', prefix) into n;
  return prefix || lpad(n::text, digits, '0');
end;
$$;

create trigger branches_updated_at before update on branches for each row execute function set_updated_at();
create trigger employees_updated_at before update on employees for each row execute function set_updated_at();
create trigger customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger services_updated_at before update on services for each row execute function set_updated_at();
create trigger reservations_updated_at before update on reservations for each row execute function set_updated_at();
create trigger service_orders_updated_at before update on service_orders for each row execute function set_updated_at();
create trigger whatsapp_templates_updated_at before update on whatsapp_templates for each row execute function set_updated_at();
create trigger landing_assets_updated_at before update on landing_assets for each row execute function set_updated_at();
