# Checklist QA Vercel - La Bajadita Barber Shop

## Objetivo

Preparar un despliegue QA en Vercel sin exponer credenciales y validando que Supabase Auth, DB, Storage y Realtime funcionen con el dominio del entorno.

## Variables requeridas

Configurar en Vercel Project Settings > Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
NEXT_PUBLIC_APP_URL
```

Para QA en Vercel:

```txt
NEXT_PUBLIC_APP_URL=https://<dominio-preview-o-produccion>
```

Reglas:

- No subir `.env.local`.
- No pegar credenciales reales en issues, commits, chats ni documentacion.
- No compartir `SUPABASE_SERVICE_ROLE_KEY`.
- Usar variables de entorno del dashboard de Vercel.
- Para producción/serverless usar `DATABASE_URL` del Pooler/Supavisor de Supabase.

Formato recomendado:

```txt
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres
```

## Supabase Auth

En Supabase Authentication > URL Configuration revisar:

- Site URL apuntando al dominio QA de Vercel.
- Redirect URLs incluyendo:
- `http://localhost:3001`
- `https://<dominio-preview-vercel>`
- `https://<dominio-produccion>` si aplica.

## Supabase Realtime

Revisar en Supabase:

- Realtime habilitado para las tablas operativas necesarias.
- `reservations`
- `service_orders`
- `product_branch_stock`
- Publicacion `supabase_realtime` actualizada por las migraciones SQL del proyecto.
- RLS no bloquea lecturas del usuario autenticado esperado.

Si el panel muestra error:

- Confirmar `NEXT_PUBLIC_SUPABASE_URL`.
- Confirmar `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Confirmar que el usuario esta autenticado.
- Confirmar que Realtime esta habilitado para las tablas.
- Usar el boton `Reintentar sincronizacion`.

## Admin QA

Antes de probar debe existir:

- Empleado admin activo.
- Sede activa asociada.
- `must_change_password=false`.
- Usuario Supabase Auth confirmado.
- Rol `admin` correcto.

El smoke falla si no existe un admin QA valido:

```txt
No active admin employee found with a valid branch and must_change_password=false
```

SQL seguro de referencia, sin datos reales:

```sql
-- 1. Reemplazar estos placeholders localmente en Supabase SQL Editor.
-- AUTH_USER_ID: id del usuario creado en Supabase Auth.
-- BRANCH_ID: id de una sede activa.
-- EMAIL_QA: email del admin QA.

update employees
set
  role = 'admin',
  branch_id = 'BRANCH_ID',
  is_active = true,
  must_change_password = false,
  onboarding_status = 'active',
  auth_user_id = 'AUTH_USER_ID',
  email = 'EMAIL_QA'
where email = 'EMAIL_QA';
```

Si no existe empleado, insertar uno manualmente usando placeholders y sin contrasenas en SQL. La contraseña se gestiona en Supabase Auth.

## Build local antes de subir

Ejecutar:

```bash
npm run lint
npm run build
npm run smoke:supabase
```

Si `smoke:supabase` falla solo por datos de admin QA, corregir seed/admin antes de cerrar QA.

## Pruebas QA minimas en Vercel

1. Login admin.
2. Login recepcion.
3. Crear reserva interna.
4. Crear reserva publica desde `/reservar`.
5. Cambiar WhatsApp de pendiente a contactado.
6. Confirmar reserva.
7. Marcar atendido.
8. Abrir atencion.
9. Agregar producto.
10. Pagar atencion.
11. Ver caja.
12. Ver ticket.
13. Ver notificacion realtime.
14. Marcar notificaciones como leidas.
15. Crear producto.
16. Importar productos XLSX.
17. Importar servicios XLSX.
18. Ver landing.
19. Ver servicios landing desde BD.
20. Ver equipo landing.
21. Ver resenas landing.
22. Probar dispositivo local con QR/token.
23. Confirmar que caja ve atencion pendiente desde dispositivo.

## Criterio de salida QA

- `npm run lint` pasa.
- `npm run build` pasa.
- `npm run smoke:supabase` pasa o queda documentado como bloqueado por datos QA.
- No hay 404 de assets `/_next/static`.
- El centro de notificaciones abre por encima de inputs/cards/modales menores.
- Realtime muestra conectando, sincronizado o error recuperable con reintento.
