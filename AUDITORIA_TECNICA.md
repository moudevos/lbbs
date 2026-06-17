# Auditoria tecnica - La Bajadita Barber Shop

## Actualizacion 2026-06-17 - XLSX definitivo y pago sin modal

### Cambios aplicados

- Se instalo una sola libreria Excel: `xlsx`.
- Se crearon helpers:
  - `src/lib/excel/create-workbook.ts`
  - `src/lib/excel/parse-xlsx.ts`
  - `src/lib/excel/export-xlsx.ts`
- Plantilla e importacion de servicios ahora usan `.xlsx`.
- Plantilla e importacion de empleados/barberos ahora usan `.xlsx`.
- Se agrego plantilla e importacion de productos en `.xlsx`.
- Reportes de caja, liquidaciones, produccion, ventas, rankings y clientes exportan `.xlsx`.
- Google Contacts se mantiene como CSV y es el unico flujo CSV de importacion.
- La lista de atenciones ya no abre modal pequeno de pago: cualquier boton `Pagar` navega a `/app/control/atenciones/[id]?focus=payment`.
- Caja ya navega a la vista completa con `focus=payment`.
- La vista completa de atencion hace scroll y resalta la seccion de pago cuando recibe `focus=payment`.
- La validacion de pago consulta `service_order_items` reales en servidor y acepta `service`, `custom_service`, `product`, `snack` y `manual_extra`.
- `reward_discount` y `discount` no cuentan como item unico valido para pagar.

### Causa exacta del error de items

- La validacion previa de pago era demasiado estrecha y no contemplaba todos los tipos reales de items operativos, especialmente `snack`, ni usaba un mensaje especifico para pago.
- Ademas, algunos botones `Pagar` abrian un modal aislado que no daba contexto completo de items ni permitia corregir la atencion antes de cobrar.

### Validacion

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run smoke:supabase`: falla por datos de entorno. Error: `No active admin employee found with a valid branch and must_change_password=false`.

## Actualizacion 2026-06-17 - Realtime, rewards, imports y exports

### Cambios aplicados

- Se agrego `supabase/sql/021_realtime_rewards_import_export.sql` con indices para imports/reportes/rewards y publicacion realtime de tablas operativas.
- Se agregaron helpers `src/lib/realtime/realtime-client.ts` y `src/lib/realtime/realtime-events.ts`.
- Se agrego `RealtimeNotificationCenter` en el header del panel interno.
- Realtime operativo escucha reservas, atenciones y stock por sede cuando la app esta abierta.
- Dispositivo local usa sincronizacion automatica cada 15 segundos con token local para reflejar reservas confirmadas sin recargar manualmente.
- Caja ya no envia al modal simple desde pendientes: el boton `Pagar` abre `/app/control/atenciones/[id]?focus=payment`.
- La vista de atencion resalta el bloque de pago cuando llega con `focus=payment`.
- El detalle de atencion permite agregar servicio, adicional y producto, y quitar items mientras la atencion esta `registrado` o `pendiente_pago`.
- Se creo modulo separado `/app/control/rewards` con listado, progreso `x / 6`, disponibles, canjeadas y canje manual.
- Se agregaron APIs `GET /api/control/rewards`, `GET /api/control/rewards/[customerId]` y `POST /api/control/rewards/[customerId]/redeem`.
- Se agrego importacion CSV de Google Contacts via `POST /api/control/customers/import`.
- Se agregaron plantillas/import CSV para servicios y empleados internos sin crear usuarios Auth masivamente.
- Se agregaron exports CSV para caja, liquidaciones, produccion, rankings y clientes.
- Se agrego panel CSV reusable para clientes, servicios y empleados.

### Decisiones tecnicas

- No se instalo libreria Excel; se uso CSV compatible con Excel como fallback explicito para reducir dependencias.
- El sistema actual descuenta stock al agregar producto a una atencion y revierte stock si el item se elimina antes de pago; se mantiene esa decision y queda documentada.
- Realtime directo se aplica al dashboard autenticado. En dispositivo local se usa refresh automatico porque opera con token local, no sesion Supabase Auth.

### Validacion

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run smoke:supabase`: falla por datos de entorno. Error: `No active admin employee found with a valid branch and must_change_password=false`.

## Actualizacion 2026-06-17 - Cierre reglas local, atenciones, WhatsApp y rankings

### Cambios aplicados

- Se agrego `supabase/sql/020_local_device_attention_production_fixes.sql` con `service_date`, `can_perform_services`, indices operativos, soporte `pendiente_pago` y `origin = local_device`.
- La agenda local ahora muestra solo reservas `confirmado` de la sede del dispositivo.
- La confirmacion local rechaza reservas que no esten confirmadas y crea atencion `pendiente_pago` con origen `local_device`.
- El modulo de dispositivos ya no muestra token crudo ni link completo con token visible; solo QR y boton para copiar enlace seguro.
- Se agrego `/local/atenciones/nueva` como pagina completa de borrador antes de guardar.
- Se agrego `POST /api/local/service-orders` para crear atenciones directas desde dispositivo sin cobrar.
- Se agrego `/local/atenciones/[id]` con vista local de solo lectura para atenciones pendientes.
- Se agrego `/local/ranking` y `GET /api/local/ranking` con conteo simple de servicios por barbero, sin montos financieros.
- Se centralizo la validacion de atenciones sin items reales en `missingAttentionItemsMessage`.
- Dashboard, local y pago rechazan atenciones sin servicio, adicional o producto.
- `GET /api/control/service-orders` usa `service_date` para reportes operativos.
- Admin puede enviar `serviceDate`; recepcion y dispositivo quedan en fecha actual.
- WhatsApp en reserva `pendiente` marca automaticamente `contactado` y audita el cambio.
- Se agrego `can_perform_services` al flujo de empleados para habilitar recepcion productiva de forma interna.
- `/app/control/atenciones/nueva` deja de abrir como modal cuando se entra por ruta directa.
- Sidebar elimina el grupo `Principal`; Dashboard, Reservas, Agenda, Atenciones y Caja quedan como botones directos.
- Se agrego `/app/control/rankings` visible para admin con rankings separados de servicios, produccion neta, venta barber_product y creditos.

### Validacion

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run smoke:supabase`: falla por datos de entorno. Error: `No active admin employee found with a valid branch and must_change_password=false`.

## Actualizacion 2026-06-17 - Avatares, duplicados, dispositivos, caja y borrador de atencion

### Problemas corregidos

- Las fotos de empleados podian quedar rotas porque `employee-avatars` usa paths de Storage y no una URL publica estable.
- Guardar una URL firmada como `profile_photo_url` generaba riesgo de expiracion y avatares rotos.
- Landing podia mostrar servicios, resenas o equipo duplicado si la respuesta traia registros repetidos.
- Faltaba gestion operativa de dispositivos locales para kiosko/agenda local.
- La caja no separaba claramente servicios, snacks, productos de barbero, pendientes, anulados, metodos y origenes.
- El formulario de atenciones guardaba al final, pero la UI no comunicaba con claridad que era un borrador en memoria hasta confirmar.
- Liquidaciones mostraba porcentaje con formato monetario en lugar de porcentaje.

### Cambios aplicados

- Se agrego `src/lib/storage/resolve-public-image-url.ts` para resolver imagenes desde Supabase Storage en servidor, usando URL publica o firmada segun bucket.
- Se agrego fallback visual por iniciales cuando un empleado no tiene foto o la carga de imagen falla.
- `GET /api/control/employees` y `GET /api/public/team` resuelven `profile_photo_path` desde `employee-avatars` antes de responder.
- La subida de avatar guarda `profile_photo_path` como fuente de verdad y no persiste URLs firmadas expirables.
- Se agrego `src/lib/utils/dedupe-by-id.ts` y se aplico en servicios, resenas y equipo publico.
- Se agrego `supabase/sql/019_device_kiosk_loaders_cash_fixes.sql` con `local_devices`, politicas, tokens revocables y soporte de estado `pendiente_pago`.
- Se agrego `/app/control/dispositivos` con creacion, regeneracion, revocacion, enlace, copia y QR.
- Se agrego `/local/login` para guardar token local seguro en navegador y entrar al flujo local.
- Caja ahora devuelve desglose de bruto, cobrado, pendiente, anulado, servicios, deducciones productivas, snacks, productos de barbero, creditos de vendedor, metodos, origenes y ranking.
- Atenciones usa componentes de borrador/resumen/barra de guardado para comunicar que no crea stock, produccion ni auditoria hasta guardar.
- Liquidaciones formatea porcentajes como porcentaje y mantiene importes monetarios con etiquetas mas claras.
- El sidebar mantiene ancho fijo y agrupa modulos por funcion mediante secciones plegables; no colapsa todo el sidebar.

### Archivos principales modificados

- `app/api/control/employees/route.ts`
- `app/api/control/employees/[id]/avatar/route.ts`
- `app/api/public/team/route.ts`
- `app/api/public/services/route.ts`
- `app/api/public/reviews/route.ts`
- `app/api/control/local-devices/route.ts`
- `app/api/control/local-devices/[id]/route.ts`
- `app/api/control/cash/summary/route.ts`
- `app/local/login/page.tsx`
- `app/app/control/dispositivos/page.tsx`
- `src/components/control/control-shell.tsx`
- `src/components/landing/team-section.tsx`
- `src/components/landing/services-marquee.tsx`
- `src/components/landing/testimonials-marquee.tsx`
- `src/components/local/local-devices-manager.tsx`
- `src/components/service-orders/service-orders-manager.tsx`
- `src/components/attentions/attention-draft-summary.tsx`
- `src/components/attentions/attention-save-bar.tsx`
- `src/components/liquidations/liquidations-manager.tsx`
- `src/lib/storage/resolve-public-image-url.ts`
- `src/lib/utils/dedupe-by-id.ts`
- `supabase/sql/019_device_kiosk_loaders_cash_fixes.sql`

### Notas de seguridad y datos

- `.data.local` no fue modificado.
- No se imprimieron credenciales reales ni se agregaron secretos al repositorio.
- `SUPABASE_SERVICE_ROLE_KEY` sigue limitado a rutas y helpers de servidor.
- `profile_photo_path` queda como dato persistente; las URLs firmadas se generan al responder desde servidor.

### Validacion

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run smoke:supabase`: falla por datos de entorno. Error: `No active admin employee found with a valid branch and must_change_password=false`.

Fecha: 2026-06-16

## Problemas encontrados

- En `/app/control/reservas`, la accion `Reprogramar` no ejecutaba reprogramacion real y dependia de un aviso de SweetAlert.
- El flujo visual de estados no distinguia la reprogramacion como accion especial frente a un simple cambio de estado.
- El boton principal de una reserva `confirmado` necesitaba cerrar la reserva y abrir/reutilizar una atencion vinculada.
- El tablero de reservas no tenia un detalle operativo con datos principales, observaciones/historial basico y acciones rapidas.
- Faltaba `showInfo` en el wrapper de SweetAlert2 solicitado.
- El endpoint de reprogramacion debia validar permisos, solapes, duracion del servicio y auditoria desde backend.

## Causa raiz

- La reprogramacion estaba modelada como una accion futura del frontend y no como una operacion transaccional con API propia.
- La disponibilidad y los permisos dependian demasiado del flujo de pantalla; la API necesitaba ser la fuente de verdad para rol, sede, estado y solape.
- La pantalla de reservas concentraba acciones, pero no exponia una vista de detalle suficiente para operar una reserva sin navegar.

## Archivos corregidos

- `app/api/control/reservations/[id]/reschedule/route.ts`
- `src/components/reservations/reservation-board.tsx`
- `src/components/reservations/reservation-status-flow.tsx`
- `src/lib/reservations/status-flow.ts`
- `src/lib/reservations/types.ts`
- `src/lib/reservations/mapper.ts`
- `src/lib/ui/swal.ts`
- `app/api/control/reservations/route.ts`

## Cambios aplicados

- Se agrego `PATCH /api/control/reservations/[id]/reschedule`.
- La API calcula `ends_at` segun duracion del servicio, valida actor, sede, estado terminal y solapes.
- Reservas confirmadas no pueden solaparse con otra confirmada del mismo barbero.
- Reservas pendientes/contactadas pueden guardar con advertencia si hay solape no terminal.
- La reprogramacion registra motivo en observaciones y auditoria con datos anteriores/nuevos.
- Se permitio que reservas `pendiente`, `contactado` y `confirmado` existan sin barbero asignado.
- La creacion publica e interna guarda `employee_id = null` cuando no hay barbero seleccionado.
- La confirmacion de reserva ya no exige barbero; solo valida precio cuando el servicio personalizado lo requiere.
- `POST /api/control/reservations/[id]/mark-attended` acepta `barberId`, valida barbero activo, sede y solape confirmado/atendido, asigna el barbero y luego crea/reutiliza la atencion.
- El PATCH generico de reservas ya no permite marcar `atendido`; esa accion debe pasar por `mark-attended`.
- Se agrego modal real de reprogramacion con sede, barbero, fecha, hora, servicio/duracion, disponibilidad y motivo.
- Se agrego modal obligatorio de seleccion de barbero al confirmar atencion si la reserva no tenia barbero.
- Se agrego modal de detalle de reserva con cliente, celular, sede, barbero, servicio, precio, fecha/hora, estado, origen, WhatsApp, observaciones e atencion vinculada.
- El flujo de estado usa `Confirmar atencion` para reservas confirmadas y `Ver atencion` para reservas atendidas con orden vinculada.
- Se agrego `showInfo` al wrapper visual de SweetAlert2.

## Rutas revisadas

- `/app/control/reservas`
- `/app/control/agenda`
- `/app/control/atenciones`
- `/app/control/caja`
- `/app/control/productos`
- `/reservar`
- `/agenda`
- `/cliente/asistencias`

## Permisos revisados

- Admin puede operar cualquier sede y cambiar sede al reprogramar.
- Recepcion queda limitada a su sede en lectura, creacion y reprogramacion.
- Barbero no puede crear ni reprogramar reservas.
- Las APIs validan permisos sin confiar solo en el frontend.

## Datos y auditoria

- Reserva interna y publica reutilizan cliente por celular mediante helpers existentes.
- Auditoria marca `created_without_barber` en reservas publicas e internas.
- Auditoria marca `confirmed_without_barber` al confirmar una reserva sin barbero.
- Auditoria registra asignacion de barbero hecha durante `mark-attended`.
- Marcado como atendido reutiliza `service_order` vinculada y evita duplicados.
- Reprogramacion excluye la propia reserva al validar disponibilidad.
- Auditoria de reprogramacion guarda sede, barbero, fechas/horas anteriores y nuevas, motivo y actor.
- Auditoria de atencion creada/reutilizada se mantiene en `mark-attended`.

## Encoding

- Se busco mojibake con patrones de caracteres mal decodificados, excluyendo `node_modules`, `.next`, `public` y landing.
- Solo aparecieron ejemplos dentro de `pront.md`, que es el archivo de instrucciones original.

## Riesgos tecnicos

- La disponibilidad publica no conoce el contexto de "editar esta reserva"; el modal agrega el horario actual a la lista para no bloquear la edicion visual, pero la API sigue siendo la validacion final.
- El historial visible en detalle usa observaciones como historial basico; el historial completo queda en auditoria.
- Cambiar barbero y asignar precio personalizado quedan cubiertos parcialmente por reprogramacion/atencion, pero podrian tener controles dedicados si se requiere una operacion mas granular.

## Pruebas realizadas

- `npm run lint`: OK.
- `npm run build`: OK. La ruta `/api/control/reservations/[id]/reschedule` compila dentro del build.
- `npm run smoke:supabase`: falla por datos de entorno. Error: `No active admin employee found with a valid branch and must_change_password=false`.

## Pendientes priorizados

1. Agregar una vista de historial de auditoria por reserva si se requiere trazabilidad completa en UI.
2. Crear acciones dedicadas para "Cambiar barbero" y "Asignar precio" desde detalle.
3. Ajustar disponibilidad publica para aceptar `excludeReservationId` y evitar el agregado local del horario actual.
4. Resolver datos semilla/entorno si `smoke:supabase` no encuentra empleado admin activo.
