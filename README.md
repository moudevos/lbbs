# La Bajadita Barber Shop

PWA profesional para reservas, agenda y control interno de La Bajadita Barber Shop.

## Stack

* Next.js App Router
* TypeScript estricto
* Tailwind CSS y CSS personalizado
* Supabase Auth
* Supabase PostgreSQL
* Supabase Storage
* Supabase RLS
* Supabase Realtime solo para reservas y agenda
* SweetAlert2
* Lucide Icons
* Vercel-ready

No se usa Firebase. No se usa Prisma.

## Instalacion

```bash
npm install
npm run dev
```

## Variables de entorno

Crear `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor. No debe importarse en componentes cliente.

## Configuracion de entorno

Copiar `.env.example` a `.env.local` y completar las credenciales desde Supabase. No subir `.env.local` al repositorio y no compartir `SUPABASE_SERVICE_ROLE_KEY`; esa clave permite operaciones administrativas y debe usarse solo en servidor.

Reglas de seguridad:

* No compartir `.env.local`.
* No subir `SUPABASE_SERVICE_ROLE_KEY`.
* No pegar credenciales en issues, commits, chats ni documentacion.
* En Vercel, configurar las variables desde el dashboard del proyecto.
* En produccion serverless, usar `DATABASE_URL` de Supabase Pooler/Supavisor.
* No usar conexiones directas a PostgreSQL para workloads serverless.

Formato recomendado de `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres
```

## Primer arranque real con Supabase

1. Crear proyecto Supabase.
2. Copiar `.env.example` a `.env.local`.
3. Completar credenciales reales solo en `.env.local`.
4. Ejecutar SQL `001` al `011` en Supabase SQL Editor.
5. Crear primer usuario en Supabase Auth.
6. Insertar primer admin en `employees`.
7. Probar `/app/login`.
8. Probar `/app/control`.
9. Probar cambio obligatorio de password.
10. Probar `/reservar`, `/app/control/reservas` y `/app/control/agenda`.

Para insertar el primer admin, usar la plantilla sin secretos y reemplazar todos los placeholders:

```text
supabase/sql/009_first_admin_template.sql
```

Validar conectividad real sin imprimir secretos:

```bash
npm run smoke:supabase
```

## SQL Supabase

Ejecutar en Supabase SQL Editor en este orden:

1. `supabase/sql/001_extensions.sql`
2. `supabase/sql/002_enums.sql`
3. `supabase/sql/003_tables.sql`
4. `supabase/sql/004_functions.sql`
5. `supabase/sql/005_rls.sql`
6. `supabase/sql/006_seed.sql`
7. `supabase/sql/007_storage.sql`
8. `supabase/sql/008_auth_rls_fixes.sql`
9. `supabase/sql/009_first_admin_template.sql`
10. `supabase/sql/010_reservations_agenda.sql`
11. `supabase/sql/011_crud_modules_fixes.sql`
12. `supabase/sql/012_employee_onboarding_rewards.sql`
13. `supabase/sql/013_services_cash_rewards_public_agenda.sql`
14. `supabase/sql/014_products_attentions_cash.sql`
15. `supabase/sql/015_branch_product_stock_dashboard.sql`
16. `supabase/sql/016_barber_production_bonuses.sql`
17. `supabase/sql/017_landing_team_reviews_liquidations.sql`
18. `supabase/sql/018_images_reviews_liquidations_kiosk.sql`

## Rutas

* `/` landing publica
* `/reservar` reserva publica
* `/app/login` login interno
* `/app/control` dashboard interno protegido
* `/app/control/cambiar-password` cambio obligatorio de password

## Crear primer admin

1. Crear un usuario en Supabase Auth.
2. Confirmar el email desde Supabase Auth.
3. Insertar el empleado vinculado al `auth.users.id`:

```sql
insert into employees (
  code,
  user_id,
  role,
  first_name,
  last_name,
  email,
  must_change_password,
  is_active
) values (
  'EMP-001',
  '<AUTH_USER_ID>',
  'admin',
  'Principal',
  'Admin',
  'admin@lbbs.local',
  false,
  true
);
```

## Flujo de desarrollo

```bash
npm run lint
npm run build
```

## Sprint actual

Implementado:

* Clientes Supabase SSR/browser/admin en `src/lib/supabase`.
* Middleware real para proteger `/app/control`.
* Login con Supabase Auth.
* Cambio obligatorio de password.
* Helper `getCurrentEmployee()`.
* Layout interno con usuario, rol, sede y menu por rol.
* Logout real.
* Endpoint admin para crear empleado con usuario.
* Endpoint admin para resetear password temporal.
* SQL incremental de RLS/auth en `008_auth_rls_fixes.sql`.
* Reserva publica inicial en `/reservar`.
* Panel de reservas en `/app/control/reservas`.
* Vista de agenda en `/app/control/agenda`.
* SQL incremental de horarios en `010_reservations_agenda.sql`.
* CRUD base de sedes, empleados, servicios, clientes y configuracion.
* SQL incremental de soporte CRUD en `011_crud_modules_fixes.sql`.
* Onboarding, celulares normalizados, conteo de visitas y rewards base en `012_employee_onboarding_rewards.sql`.
* Servicios realizados, pagos, caja base, rewards reales y agenda publica en `013_services_cash_rewards_public_agenda.sql`.
* Productos, stock simple y estructura POS de atenciones en `014_products_attentions_cash.sql`.
* Stock por sede, movimientos auditables y base de dashboard gerencial en `015_branch_product_stock_dashboard.sql`.
* Produccion de barberos, bonos y creditos por productos en `016_barber_production_bonuses.sql`.
* Landing desde BD, perfiles/fotos de barberos, reseñas moderadas y liquidaciones base en `017_landing_team_reviews_liquidations.sql`.
* Compresion de imagenes, QR de reseñas, snapshots inmutables de liquidaciones y modo local/kiosko en `018_images_reviews_liquidations_kiosk.sql`.

## Storage

Buckets usados:

* `landing-assets`: imagenes publicas de landing.
* `branch-gallery`: galeria publica de sedes.
* `work-gallery`: trabajos realizados.
* `employee-avatars`: fotos de barberos, subidas desde API interna protegida.
* `service-images`: imagenes de servicios.

Reglas operativas:

* No usar URLs externas para imagenes subidas por usuarios.
* Subir fotos de barberos desde `/app/control/empleados`.
* Validar tipo `jpg`, `png` o `webp`.
* Tamaño maximo actual para avatar: 2MB.
* No exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente.
* Si una imagen supera 2MB, se comprime en cliente con canvas antes de subir.
* Formato preferido de subida: WebP.

## Landing dinamica

La landing consume:

* `GET /api/public/services`
* `GET /api/public/team`
* `GET /api/public/reviews`

Las reseñas publicas se envian desde `/cliente/resena` y quedan pendientes hasta aprobacion en `/app/control/resenas`.

El dashboard de reseñas muestra QR descargable y link copiable para compartir `/cliente/resena`.

## Liquidaciones

La ruta `/app/control/liquidaciones` calcula sobre `barber_production_entries`.

Reglas:

* Caja real, produccion y liquidacion son conceptos separados.
* Servicios usan produccion calculada ya registrada.
* Productos `barber_product` suman credito vendedor.
* `snack` no suma credito vendedor.
* Admin puede generar borrador, aprobar y marcar pagado.
* Una liquidacion `approved` o `paid` guarda snapshot y no debe recalcularse automaticamente.

## WhatsApp por estado

Las reservas usan plantillas por estado:

* `primer_contacto`
* `seguimiento`
* `recordatorio`
* `reprogramacion`
* `cancelacion`
* `no_asistio`
* `agradecimiento`

Si falta una plantilla, el sistema muestra alerta y no abre WhatsApp. La generacion del link se audita como `whatsapp_link_generated`.

## Modo Local / Kiosko

Rutas:

* `/local`
* `/local/agenda`
* `/local/atenciones/nueva`
* `/local/atenciones/[id]`

Seguridad:

* Usa token de dispositivo generado por admin via `POST /api/control/local-devices`.
* El token se guarda hasheado en `local_device_tokens`.
* El modo local solo ve agenda de su sede y confirma atenciones.
* Caja cobra despues desde pendientes de cobro.
