create index if not exists branches_is_active_idx on branches(is_active);
create index if not exists services_branch_active_idx on services(branch_id, is_active);
create index if not exists customers_phone_idx on customers(phone);
create index if not exists customers_branch_active_idx on customers(branch_id, is_active);
create index if not exists employees_role_branch_idx on employees(role, branch_id, is_active);
create index if not exists reservations_customer_idx on reservations(customer_id);

insert into app_settings (key, value)
values (
  'business_profile',
  '{
    "businessName": "La Bajadita Barber Shop",
    "customServiceDurationMinutes": 60,
    "phones": [],
    "socialLinks": [],
    "landingPlaceholders": []
  }'::jsonb
)
on conflict (key) do nothing;

insert into whatsapp_templates (key, name, body) values
('reprogramacion', 'Reprogramacion', 'Hola {cliente}, te escribimos de La Bajadita Barber Shop para reprogramar tu reserva en {sede}. Servicio: {servicio}. Nueva fecha sugerida: {fecha} a las {hora}.')
on conflict (key) do nothing;
