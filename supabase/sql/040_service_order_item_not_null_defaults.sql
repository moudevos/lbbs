update public.service_order_items
set discount_amount = coalesce(discount_amount, 0),
    seller_credit_amount = coalesce(seller_credit_amount, 0),
    counts_for_seller_credit = coalesce(counts_for_seller_credit, false),
    stock_controlled = coalesce(stock_controlled, false);

alter table public.service_order_items
  alter column discount_amount set default 0,
  alter column discount_amount set not null,
  alter column seller_credit_amount set default 0,
  alter column seller_credit_amount set not null,
  alter column counts_for_seller_credit set default false,
  alter column counts_for_seller_credit set not null,
  alter column stock_controlled set default false,
  alter column stock_controlled set not null;
