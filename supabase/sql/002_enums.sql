do $$ begin
  create type app_role as enum ('admin', 'recepcion', 'barbero');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('pendiente', 'contactado', 'confirmado', 'atendido', 'cancelado', 'no_asistio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_order_status as enum ('registrado', 'pagado', 'anulado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia', 'mixto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_event_type as enum ('login', 'logout', 'create', 'update', 'delete', 'status_change', 'payment', 'upload');
exception when duplicate_object then null; end $$;
