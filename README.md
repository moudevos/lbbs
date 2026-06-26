# La Bajadita Barber Shop

## Arquitectura actual

El landing publico se separo en un proyecto Astro hermano:

```txt
../lbbs-landing-astro
```

Este proyecto Next.js conserva reservas, dashboard, APIs, Supabase, dispositivos y hotspot. El landing Astro consume datos mediante APIs publicas de este proyecto:

```txt
/api/public/landing/services
/api/public/landing/team
/api/public/landing/gallery
/api/public/landing/branches
/api/public/landing/reviews
/api/public/landing/settings
```

Dominios recomendados:

```txt
labajaditabarberstudio.com              -> Astro landing
control.labajaditabarberstudio.com      -> Next dashboard
reservas.labajaditabarberstudio.com     -> Next reservas
dispositivos.labajaditabarberstudio.com -> Next dispositivos
```

No asignar el dominio raiz a Next y Astro al mismo tiempo. Ver `docs/ARCHITECTURE.md`, `docs/LANDING_ASTRO_MIGRATION.md`, `docs/API_PUBLIC_LANDING.md` y `docs/DEPLOYMENT_DOMAINS.md`.

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
NEXT_PUBLIC_APP_URL=https://labajaditabarberstudio.com
DATABASE_URL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
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
* `GET /api/public/gallery`

La galeria se administra en `/app/control/landing/galeria` por usuarios admin. Requiere ejecutar `supabase/sql/022_landing_gallery_dynamic.sql`.

La configuracion de GA4 y Google Search Console esta documentada en `docs/GOOGLE_ANALYTICS_SEARCH_CONSOLE.md`.

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

## Alcance operativo auditado (junio de 2026)

Esta seccion describe el comportamiento encontrado en el repositorio. Su
disponibilidad en Supabase depende de haber aplicado los SQL incrementales.

### Reservas

* `/reservar` registra reservas publicas y `/app/control/reservas` permite su
  gestion interna.
* La agenda se consulta desde `/app/control/agenda` y desde el dispositivo
  asociado a una sede.
* Una reserva puede convertirse en atencion. El flujo local deja la orden en
  `pendiente_pago` para que Caja realice el cobro.
* Las reservas personalizadas pueden confirmarse sin precio definitivo; el
  trabajo realizado y su precio se completan al registrar la atencion.
* Los recordatorios buscan reservas confirmadas proximas a 20 minutos en zona
  horaria `America/Lima` y evitan duplicados mediante
  `reservation_reminders`.

### Atenciones desde dashboard

* `/app/control/atenciones/nueva` crea atenciones para clientes existentes,
  nuevos o genericos.
* La orden admite varios servicios, productos, observaciones, barbero
  responsable, servicios personalizados y cortesias.
* Solo las ordenes `registrado` o `pendiente_pago` admiten cambios de items.
  Las ordenes pagadas o anuladas no se editan.
* `/app/control/atenciones/[id]` concentra items, descuentos, resumen, pagos y
  trazabilidad.

### Atenciones desde dispositivos/local

* El dispositivo usa un token hasheado y queda limitado a su sede.
* `/local/agenda` muestra la agenda y `/local/atenciones/nueva` registra una
  atencion directa.
* El flujo local busca clientes por celular y admite cliente generico,
  multiples servicios, productos y servicio personalizado.
* Las ordenes del dispositivo usan `origin = local_device` y
  `status = pendiente_pago`; no cobran directamente y deben finalizarse en
  Caja.
* Confirmar una reserva desde dispositivo tambien deja su atencion pendiente de
  cobro.

### Caja, items y ticket

* `/app/control/caja` lista ordenes pendientes, tickets del dia, resumen por
  metodo y cierres.
* Caja admite efectivo, Yape, Plin, tarjeta, transferencia, reward y pago
  mixto.
* El total se calcula desde los items persistidos, descuentos y rewards. Una
  orden necesita items validos antes del pago.
* Los productos conservan cantidad, precio original, descuento y vendedor para
  trazabilidad y creditos.
* El ticket se obtiene desde una API protegida y se descarga o comparte como
  PDF termico de 80 mm generado con `jsPDF`; no captura la pantalla completa.

### Rewards y descuentos

* El cliente generico no acumula ni canjea rewards.
* Las visitas se contabilizan desde atenciones elegibles pagadas, evitando
  contar dos veces la misma orden.
* El reward se aplica a un corte clasico antes del pago y se confirma al
  finalizar la orden.
* `/app/control/rewards` muestra progreso, disponibles, canjes y metricas.
* `034_customer_product_discount_rewards_ux.sql` agrega precio original,
  porcentaje y regla de descuento a los items.
* La configuracion inicial aplica 10% a productos `barber_product` con al menos
  dos visitas validas. El backend valida la elegibilidad y el resumen incorpora
  el descuento.

### Notificaciones, sonido y Push

* `notification_events` conserva los avisos. Pueden marcarse como leidos,
  descartarse individualmente o limpiarse de forma persistente.
* El dashboard recibe Broadcast privado por sede. Los dispositivos usan el
  canal publico separado `branch:<branch_id>:devices`.
* La capa global muestra hasta cinco toasts, evita duplicados por ID y reproduce
  sonido cuando el usuario lo habilita.
* Web Push distingue suscripciones `dashboard` y `local_device` y requiere
  configuracion VAPID para el envio real.
* El alcance final de `036` evita que el dashboard se notifique a si mismo por
  cada cambio: avisa una reserva nueva y una atencion creada desde dispositivo.
* El endpoint cron de Vercel queda como fallback o prueba manual. El
  procesamiento principal usa Supabase Cron cada cinco minutos.

### SQL 029 a 036

Aplicar en este orden solo los archivos que aun no existan en el Supabase del
entorno:

1. `supabase/sql/029_realtime_broadcast_notifications.sql`: eventos,
   funcion central y triggers iniciales de Broadcast.
2. `supabase/sql/030_supabase_cron_reservation_reminders.sql`: `pg_cron`,
   `pg_net`, recordatorios y job cada cinco minutos.
3. `supabase/sql/031_push_realtime_notifications_dashboard_devices.sql`:
   descarte persistente, Push y canales separados.
4. `supabase/sql/032_supabase_cron_push_reminders.sql`: reafirma el job y
   agrega una funcion de prueba.
5. No existe un archivo `033` en el repositorio auditado.
6. `supabase/sql/034_customer_product_discount_rewards_ux.sql`: trazabilidad y
   configuracion del descuento recurrente.
7. `supabase/sql/036_notification_scope_operational_fixes.sql`: limita el
   alcance de las notificaciones operativas.

`supabase/sql/035_reset_operational_test_data.sql` no es una migracion normal.
Es una herramienta destructiva y opcional para reiniciar datos operativos de
prueba. Conserva catalogos, servicios, productos, clientes,
empleados/usuarios, sedes, configuracion, galeria y resenas. Solo se habilita
deliberadamente en la misma sesion:

```sql
set app.lbbs_reset_confirmation = 'RESET_LBBS_OPERATIONAL_DATA';
```

No ejecutar `035` en produccion sin respaldo y confirmacion expresa.

### Validacion

Comandos tecnicos:

```bash
npm run lint
npm run build
npm run smoke:supabase
```

Pruebas operativas recomendadas:

1. Crear una reserva publica y comprobar que genera un solo aviso.
2. Crear una atencion desde `/local`, verificar `pendiente_pago` y cobrarla en
   Caja.
3. Crear una orden mixta con servicio y producto; revisar items, descuento,
   total y stock.
4. Descargar y compartir el PDF del ticket pagado.
5. Marcar, descartar y limpiar notificaciones.
6. Ejecutar `select public.process_reservation_reminders();` y comprobar que no
   duplica recordatorios.
7. Consultar `cron.job` y `cron.job_run_details` para validar Supabase Cron.
