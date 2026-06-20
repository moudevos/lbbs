alter table services
  add column if not exists allow_manual_price boolean not null default false,
  add column if not exists is_custom_service boolean not null default false;

insert into services (sku, name, description, duration_minutes, price, branch_id, is_active, allow_manual_price, is_custom_service)
values ('CUSTOM', 'Personalizado', 'Servicio personalizado con descripcion y precio manual.', 60, 0, null, true, true, true)
on conflict (sku) do update set
  name = excluded.name,
  branch_id = null,
  is_active = true,
  allow_manual_price = true,
  is_custom_service = true,
  updated_at = now();
  