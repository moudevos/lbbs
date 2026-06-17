create index if not exists idx_customers_normalized_phone_import
  on customers(normalized_phone);

create index if not exists idx_customer_reward_accounts_customer
  on customer_reward_accounts(customer_id);

create index if not exists idx_customer_reward_ledger_customer_created
  on customer_reward_ledger(customer_id, created_at desc);

create index if not exists idx_customer_reward_redemptions_customer_created
  on customer_reward_redemptions(customer_id, redeemed_at desc);

create index if not exists idx_service_orders_reports_service_date
  on service_orders(service_date, branch_id, status);

create index if not exists idx_barber_production_entries_reports
  on barber_production_entries(counted_at, branch_id, barber_id, entry_type);

do $$
begin
  begin
    alter publication supabase_realtime add table reservations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table service_orders;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table product_branch_stock;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table local_devices;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
