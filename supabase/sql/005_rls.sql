alter table branches enable row level security;
alter table employees enable row level security;
alter table customers enable row level security;
alter table services enable row level security;
alter table reservations enable row level security;
alter table service_orders enable row level security;
alter table service_order_items enable row level security;
alter table payment_details enable row level security;
alter table whatsapp_templates enable row level security;
alter table app_settings enable row level security;
alter table landing_assets enable row level security;
alter table audit_logs enable row level security;

create policy "public read landing" on branches for select using (true);
create policy "authenticated read own data" on reservations for select using (auth.uid() is not null);
