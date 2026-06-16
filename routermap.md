# La Bajadita Barber Shop — PWA de Control

Sistema PWA para el control operativo de **La Bajadita Barber Shop**.

El sistema cubrirá reservas, sedes, agenda por barbero, servicios, clientes, empleados, pagos, control básico de caja, plantillas de WhatsApp, auditoría y landing pública profesional.

## 1. Stack técnico

* Next.js con App Router
* TypeScript
* Supabase Auth
* Supabase PostgreSQL
* Supabase Storage
* Supabase Realtime limitado a reservas/agenda
* Supabase RLS para seguridad por rol y sede
* Tailwind CSS
* CSS personalizado con paleta negro / amarillo oro
* SweetAlert2
* Lucide Icons
* PWA instalable
* Vercel para despliegue
* VS Code + Codex para desarrollo asistido

## 2. Estructura pública y privada

Rutas principales:

* `/` landing pública
* `/reservar` reserva pública sin login
* `/app/control` dashboard interno
* `/app/control/reservas`
* `/app/control/agenda`
* `/app/control/clientes`
* `/app/control/empleados`
* `/app/control/servicios`
* `/app/control/sedes`
* `/app/control/caja`
* `/app/control/configuracion`
* `/app/control/auditoria`
* `/app/control/cambiar-password`

## 3. Roles iniciales

### Admin

Acceso total.

Puede:

* Ver todas las sedes
* Crear, editar, desactivar y resetear usuarios
* Administrar empleados
* Administrar servicios
* Administrar clientes
* Administrar reservas
* Administrar configuración
* Ver auditoría completa
* Ver reportes globales
* Gestionar fotos, placeholders y contenido de landing

### Recepción

Acceso limitado a su sede asignada.

Puede:

* Ver reservas de su sede
* Crear reservas internas
* Confirmar reservas públicas
* Editar reservas de su sede
* Cambiar barbero asignado
* Asignar precio a servicios personalizados
* Registrar servicios realizados
* Registrar pagos simples o mixtos
* Gestionar clientes de su sede
* Ver empleados/barberos de su sede
* Ver servicios disponibles
* Usar plantillas de WhatsApp

No puede:

* Ver sedes ajenas
* Ver auditoría global
* Crear admins
* Modificar configuración global sensible

### Barbero

Acceso limitado.

Puede:

* Ver su agenda
* Ver sus reservas asignadas
* Ver sus cortes/servicios realizados
* Ver datos mínimos del cliente necesarios para atención

No puede:

* Crear empleados
* Editar servicios
* Editar pagos
* Ver caja
* Ver auditoría global
* Ver reservas de otros barberos, salvo que admin lo permita después

## 4. Sedes iniciales

Sedes base:

* Sede 1
* Sede 2

Cada sede tendrá:

* Código interno: `SED-001`, `SED-002`
* Nombre
* Dirección
* Celular de contacto
* Estado activo/inactivo
* Horario semanal propio
* Fotos editables desde configuración
* Placeholder visual elegante por defecto

## 5. Empleados

Los empleados se guardan en tabla separada de clientes.

Tipos:

* Admin
* Recepción
* Barbero

Campos base:

* Código: `EMP-001`
* Nombres
* Apellidos
* Celular
* Email
* Rol
* Sede asignada
* Estado activo/inactivo
* Usuario Supabase asociado
* `must_change_password`
* Avatar editable o placeholder

## 6. Flujo de creación de usuarios internos

El admin crea un empleado desde el panel.

Flujo:

1. Admin registra datos del empleado.
2. Sistema crea usuario interno en Supabase Auth desde servidor.
3. El email queda confirmado automáticamente.
4. Sistema genera contraseña temporal.
5. La contraseña temporal se muestra al admin una sola vez.
6. El empleado inicia sesión.
7. El sistema detecta `must_change_password = true`.
8. El empleado es obligado a cambiar contraseña.
9. Luego de cambiarla, `must_change_password = false`.

Reglas:

* La contraseña temporal no se guarda en texto plano.
* Si el admin pierde la contraseña temporal, debe resetearla.
* Al resetear, se genera una nueva contraseña temporal.
* Después del reset, el usuario vuelve a `must_change_password = true`.

## 7. Clientes

Los clientes estarán en tabla independiente.

Identificador principal:

* Celular

Campos:

* Celular
* Nombre completo
* Notas
* Fecha de creación
* Última visita
* Sede origen
* Estado activo/inactivo

Regla:

* Un cliente puede reservar desde la landing sin login.
* No se mezcla tabla de clientes con tabla de empleados.

## 8. Servicios

Cada servicio tendrá:

* SKU automático: `SRV-0001`
* Nombre
* Descripción
* Duración en minutos
* Precio base
* Estado activo/inactivo
* Imagen opcional
* Sede aplicable o global

Ejemplos:

* Corte clásico
* Corte + barba
* Barba
* Perfilado
* Servicio personalizado

## 9. Servicios personalizados

Un servicio personalizado puede ser solicitado por el cliente o registrado por recepción.

Reglas:

* Entra inicialmente sin precio.
* Queda en estado pendiente.
* Recepción coordina por WhatsApp.
* Recepción asigna precio antes de confirmar.
* Puede asignarse barbero desde el inicio o cambiarse luego.
* Si no tiene duración definida, se usará una duración estimada configurable.

Código interno:

* `CUSTOM`

## 10. Reservas

Las reservas pueden ser creadas desde:

* Landing pública
* Panel de recepción
* Panel admin

Campos:

* Sede
* Cliente
* Fecha
* Hora de inicio
* Hora de fin
* Barbero opcional
* Servicio fijo o personalizado
* Precio, si corresponde
* Estado
* Observaciones
* Origen: público, recepción, admin
* WhatsApp generado
* Auditoría

Estados:

* `pendiente`
* `contactado`
* `confirmado`
* `atendido`
* `cancelado`
* `no_asistio`

Reglas:

* Reserva pública siempre entra como pendiente.
* Para pasar a confirmado debe tener sede, fecha, hora, cliente, servicio y precio si es personalizado.
* Un barbero no puede tener dos reservas confirmadas cruzadas.
* Las reservas pendientes pueden cruzarse, pero el sistema debe advertirlo.
* La disponibilidad depende de sede, horario del barbero y reservas confirmadas.

## 11. Agenda y disponibilidad

Cada sede tiene horario propio.

Cada barbero tiene horario propio asignado al crearlo.

La disponibilidad se calcula así:

1. La sede debe estar abierta.
2. El barbero debe estar disponible.
3. No debe existir reserva confirmada cruzada.
4. La duración del servicio bloquea el rango completo.

Ejemplo:

* Reserva a las 9:00 a.m.
* Duración: 45 minutos
* El siguiente espacio disponible inicia a las 9:45 a.m.

No se usarán slots rígidos fijos. El sistema calculará rangos reales según duración.

## 12. Servicios realizados / cortes

Recepción puede registrar un servicio realizado sin reserva previa.

Flujo:

1. Recepción selecciona sede.
2. Selecciona cliente o crea cliente rápido.
3. Selecciona barbero.
4. Selecciona servicio fijo.
5. Puede agregar adicionales con nombre y monto.
6. Registra método de pago.
7. Guarda el servicio realizado.
8. Se asigna al barbero.
9. Queda disponible para reportes.

Estados:

* `registrado`
* `pagado`
* `anulado`

## 13. Métodos de pago

Métodos iniciales:

* Efectivo
* Yape
* Plin
* Tarjeta
* Transferencia
* Mixto

Para pago mixto se debe permitir asignar montos por método.

Ejemplo:

Total: S/ 50

* Efectivo: S/ 20
* Yape: S/ 30

La suma de pagos debe coincidir con el total.

## 14. Caja base

Para el MVP se registrarán pagos.

No se implementará aún cierre avanzado, pero la estructura debe quedar preparada para:

* Cierres por sede
* Arqueo de caja
* Diferencias
* Reportes por método de pago
* Reportes por barbero
* Reportes por fecha

## 15. WhatsApp

No se usará API oficial en el MVP.

Se usará botón/link manual con mensaje prellenado.

Plantillas configurables:

* Primer contacto
* Confirmación de reserva
* Recordatorio de reserva
* Agradecimiento por servicio
* Cancelación
* Reprogramación

Las plantillas deben permitir variables:

* `{cliente}`
* `{sede}`
* `{fecha}`
* `{hora}`
* `{barbero}`
* `{servicio}`
* `{precio}`
* `{telefono_sede}`

Ejemplo:

Hola {cliente}, somos La Bajadita Barber Shop. Te escribimos para confirmar tu reserva en {sede} para el día {fecha} a las {hora}. Servicio: {servicio}. Barbero: {barbero}. Precio: S/ {precio}.

## 16. Landing pública

La landing debe ser elegante, moderna y profesional.

Secciones:

* Hero principal
* Servicios destacados
* Sedes
* Equipo de trabajo
* Ofertas
* Carrusel de fotos de sedes
* Carrusel de trabajos realizados
* Botón reservar
* Botón WhatsApp
* Redes sociales
* Footer

Diseño:

* Paleta negro / amarillo oro
* Alto contraste
* Look premium
* Estilo barbería moderna
* Placeholder elegante para logo y fotos
* Todo editable después desde configuración

## 17. Configuración

Módulo `/app/control/configuracion`.

Debe permitir editar:

* Datos de la barbería
* Logo
* Imágenes de landing
* Fotos de sedes
* Fotos de trabajos realizados
* Plantillas de WhatsApp
* Horarios por sede
* Horarios por barbero
* Ofertas visibles
* Redes sociales
* Teléfonos de contacto
* Parámetros de duración estimada para servicio personalizado

## 18. Supabase Storage

Buckets sugeridos:

* `landing-assets`
* `branch-gallery`
* `work-gallery`
* `employee-avatars`
* `service-images`

Reglas:

* Las imágenes públicas de landing pueden servirse públicamente.
* Las cargas, ediciones y eliminaciones solo se realizan desde usuarios autorizados.
* El sistema debe mostrar placeholders si no existen imágenes cargadas.

## 19. Auditoría

Todo cambio importante debe auditarse.

Acciones mínimas auditadas:

* Login
* Logout
* Creación de reserva
* Edición de reserva
* Cambio de estado de reserva
* Cancelación
* No asistió
* Atención completada
* Creación de cliente
* Edición de cliente
* Creación de empleado
* Edición de empleado
* Reset de contraseña
* Cambio de rol
* Cambio de sede asignada
* Creación de servicio
* Edición de servicio
* Desactivación
* Registro de pago
* Anulación de servicio
* Edición de plantilla WhatsApp
* Edición de configuración
* Carga/eliminación de imagen

Campos de auditoría:

* ID
* Usuario actor
* Rol actor
* Sede actor
* Acción
* Tabla afectada
* Registro afectado
* Valores anteriores
* Valores nuevos
* Fecha/hora
* IP si está disponible
* User agent si está disponible

## 20. Soft delete

No se debe borrar físicamente información operativa.

Usar:

* `is_active`
* `deleted_at`
* `deleted_by`

Aplicar a:

* Empleados
* Clientes
* Servicios
* Sedes
* Reservas
* Registros de servicio
* Configuraciones editables

## 21. Seguridad

Reglas:

* Supabase Auth para login.
* RLS obligatorio.
* Admin ve todo.
* Recepción solo ve su sede.
* Barbero solo ve su agenda y servicios realizados.
* Cliente público solo puede crear reserva pública.
* `service_role` solo en servidor.
* Ninguna clave privada debe exponerse en frontend.
* Middleware debe proteger `/app/control`.
* Usuario con `must_change_password = true` solo accede a cambio de contraseña.

## 22. Roadmap de desarrollo

### Sprint 0 — Inicialización

Objetivo:

Crear base del proyecto.

Tareas:

* Crear proyecto Next.js con TypeScript.
* Instalar Tailwind.
* Instalar SweetAlert2.
* Instalar Lucide Icons.
* Configurar estructura de carpetas.
* Configurar PWA.
* Crear layout base.
* Crear variables de entorno.
* Configurar cliente Supabase.
* Configurar cliente admin Supabase solo servidor.

Resultado:

Proyecto ejecutando localmente.

---

### Sprint 1 — Base de datos Supabase

Objetivo:

Crear esquemas SQL ejecutables en Supabase SQL Editor.

Tareas:

* Crear enums.
* Crear tablas.
* Crear índices.
* Crear funciones de códigos automáticos.
* Crear triggers de timestamps.
* Crear estructura de auditoría.
* Crear políticas RLS.
* Crear seed inicial de sedes, servicios y plantillas WhatsApp.

Archivos sugeridos:

* `supabase/sql/001_extensions.sql`
* `supabase/sql/002_enums.sql`
* `supabase/sql/003_tables.sql`
* `supabase/sql/004_functions.sql`
* `supabase/sql/005_rls.sql`
* `supabase/sql/006_seed.sql`
* `supabase/sql/007_storage.sql`

Resultado:

Base lista para MVP.

---

### Sprint 2 — Auth, roles y sesión

Objetivo:

Implementar login interno seguro.

Tareas:

* Login con Supabase Auth.
* Middleware de protección.
* Carga de perfil de empleado.
* Validación de rol.
* Validación de sede.
* Cambio obligatorio de contraseña.
* Crear usuario desde admin.
* Resetear contraseña temporal.
* Logout.
* Control de sesión persistente.

Resultado:

Sistema interno seguro y funcional.

---

### Sprint 3 — App shell y navegación

Objetivo:

Crear interfaz interna profesional.

Tareas:

* Sidebar deslizable.
* Navbar superior.
* Menú según rol.
* Dashboard inicial.
* Componentes reutilizables.
* Cards.
* Tablas.
* Modales.
* Estados vacíos.
* Loaders.
* Confirmaciones con SweetAlert2.
* Íconos con Lucide.

Resultado:

Base visual lista.

---

### Sprint 4 — CRUD principales

Objetivo:

Implementar administración operativa.

Módulos:

* Sedes
* Empleados
* Clientes
* Servicios
* Plantillas WhatsApp

Reglas:

* Admin administra todo.
* Recepción limitado a su sede.
* Barbero solo lectura mínima.

Resultado:

Gestión interna base completa.

---

### Sprint 5 — Reservas y agenda

Objetivo:

Implementar motor principal de reservas.

Tareas:

* Crear reserva interna.
* Crear reserva pública.
* Ver agenda por sede.
* Ver agenda por barbero.
* Validar horarios.
* Validar cruces.
* Cambiar estados.
* Confirmar por WhatsApp.
* Asignar precio a personalizado.
* Reasignar barbero.
* Reprogramar.
* Cancelar.
* Marcar no asistió.
* Marcar atendido.

Resultado:

Reservas funcionales.

---

### Sprint 6 — Servicios realizados y pagos

Objetivo:

Registrar cortes/servicios y pagos.

Tareas:

* Registrar servicio directo.
* Convertir reserva atendida en servicio realizado.
* Agregar adicionales.
* Registrar pago simple.
* Registrar pago mixto.
* Validar suma de pagos.
* Preparar datos para caja.

Resultado:

Control base de ganancias.

---

### Sprint 7 — Landing y reserva pública

Objetivo:

Crear experiencia pública elegante.

Tareas:

* Landing principal.
* Servicios destacados.
* Sedes.
* Equipo.
* Ofertas.
* Carrusel sedes.
* Carrusel trabajos.
* Botón reservar.
* Formulario público de reserva.
* Botón WhatsApp.
* Placeholders premium.
* Diseño responsive.

Resultado:

Web pública lista para clientes.

---

### Sprint 8 — Configuración y Storage

Objetivo:

Personalizar la barbería.

Tareas:

* Subir logo.
* Subir fotos landing.
* Subir fotos sedes.
* Subir fotos trabajos.
* Editar plantillas WhatsApp.
* Editar horarios.
* Editar ofertas.
* Editar datos públicos.

Resultado:

Sistema personalizable.

---

### Sprint 9 — Realtime, auditoría y QA

Objetivo:

Cerrar MVP con calidad.

Tareas:

* Activar Realtime solo para reservas y agenda.
* Refrescar agenda al cambiar reservas.
* Auditar acciones críticas.
* Probar RLS.
* Probar roles.
* Probar reserva pública.
* Probar pagos mixtos.
* Probar cambio obligatorio de contraseña.
* Probar PWA.
* Probar responsive móvil.
* Corregir errores de build.
* Preparar deploy Vercel.

Resultado:

MVP listo para producción inicial.

## 23. Criterios de aceptación del MVP

El MVP se considera terminado cuando:

* El cliente puede reservar desde la landing sin login.
* Recepción puede confirmar reservas por WhatsApp manual.
* Admin puede gestionar sedes, empleados, servicios y clientes.
* Barbero puede ver su agenda.
* Recepción solo ve su sede.
* Admin ve todo.
* Se puede registrar servicio realizado.
* Se puede registrar pago simple y mixto.
* Se puede cambiar contraseña obligatoriamente al primer login.
* Se puede resetear contraseña temporal.
* Se auditan acciones críticas.
* La landing tiene placeholders elegantes y es editable.
* La app funciona como PWA.
* El build pasa sin errores.
* Está lista para desplegar en Vercel.

## 24. Variables de entorno sugeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
```

Regla:

`SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en cliente.

## 25. Decisiones técnicas cerradas

* Nombre: La Bajadita Barber Shop.
* Sedes iniciales: Sede 1 y Sede 2.
* Roles iniciales: admin, recepción, barbero.
* Clientes pueden reservar sin login.
* Sistema interno vive en `/app/control`.
* Reserva pública entra como pendiente.
* WhatsApp será manual con mensaje prellenado.
* Plantillas WhatsApp serán configurables.
* Servicios tienen SKU automático.
* Servicio personalizado entra sin precio inicial.
* Recepción asigna precio antes de confirmar.
* Disponibilidad depende de sede, barbero, duración y reservas confirmadas.
* Pagos pueden ser simples o mixtos.
* Fotos y logo serán personalizables.
* Mientras tanto se usan placeholders elegantes.
* No hay borrado físico.
* Todo cambio relevante se audita.
