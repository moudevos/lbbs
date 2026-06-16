# Implementación inicial

Estado entregado:

* Scaffold completo en Next.js App Router con TypeScript estricto.
* Landing pública mínima profesional en `/`.
* Ruta pública base `/reservar`.
* Shell interno base en `/app/control`.
* Ruta comodín para módulos internos en `/app/control/[...slug]`.
* Middleware placeholder para proteger `/app/control`.
* Clientes Supabase para navegador, servidor y admin.
* Base de estilos con paleta negro / oro.
* SQL inicial para Supabase en `supabase/sql`.

Validación ejecutada:

* `npm install`
* `npm run lint`
* `npm run build`

Orden de SQL:

1. `supabase/sql/001_extensions.sql`
2. `supabase/sql/002_enums.sql`
3. `supabase/sql/003_tables.sql`
4. `supabase/sql/004_functions.sql`
5. `supabase/sql/005_rls.sql`
6. `supabase/sql/006_seed.sql`
7. `supabase/sql/007_storage.sql`

Pendiente para siguiente sprint:

* Autenticación real con Supabase SSR y middleware de sesión.
* UI completa de reservas y agenda.
* CRUDs de sedes, empleados, clientes y servicios.
* RLS refinada por rol/sede.
* PWA manifest/service worker.
* Integración real de Storage.
* Auditoría y formularios con SweetAlert2.
