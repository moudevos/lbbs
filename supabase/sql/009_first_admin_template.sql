-- Plantilla para crear el primer admin operativo.
-- No contiene credenciales, claves ni passwords.
-- Reemplazar los valores marcados antes de ejecutar en Supabase SQL Editor.

insert into employees (
  code,
  user_id,
  branch_id,
  role,
  first_name,
  last_name,
  email,
  must_change_password,
  is_active
) values (
  'EMP-001',
  '<REEMPLAZAR_AUTH_USER_ID>',
  '<REEMPLAZAR_BRANCH_ID>',
  'admin',
  '<REEMPLAZAR_NOMBRE>',
  '<REEMPLAZAR_APELLIDO>',
  '<REEMPLAZAR_EMAIL>',
  false,
  true
) on conflict (user_id) do update set
  branch_id = excluded.branch_id,
  role = 'admin',
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  must_change_password = false,
  is_active = true,
  deleted_at = null,
  deleted_by = null,
  updated_at = now();

-- branch_id debe ser el id de una sede existente, por ejemplo una fila creada por 006_seed.sql.
-- Para este primer smoke test se recomienda asignar una sede real y activa.
