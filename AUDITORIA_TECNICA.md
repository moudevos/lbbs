# Auditoria tecnica - La Bajadita Barber Shop

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
