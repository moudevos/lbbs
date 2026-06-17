alter table public.landing_assets
  add column if not exists description text,
  add column if not exists service_name text,
  add column if not exists barber_name text,
  add column if not exists image_path text,
  add column if not exists image_url text,
  add column if not exists alt_text text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists featured boolean not null default false;

update public.landing_assets
set image_path = path
where image_path is null and path is not null;

create index if not exists landing_assets_gallery_public_idx
  on public.landing_assets (asset_type, is_active, sort_order, created_at desc);

comment on column public.landing_assets.image_path is
  'Ruta relativa en Supabase Storage. Es la fuente de verdad para imagenes administradas.';
comment on column public.landing_assets.image_url is
  'Compatibilidad temporal. No usar para nuevas cargas de galeria.';

