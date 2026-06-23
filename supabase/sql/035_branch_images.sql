alter table public.branches
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists image_alt text;
