# Realtime Broadcast

## Instalacion

Ejecutar `supabase/sql/029_realtime_broadcast_notifications.sql` después de las migraciones anteriores.

La migración:

- habilita `payload` en `notification_events`;
- permite recibir Broadcast a usuarios autenticados;
- crea `create_operational_notification`;
- agrega triggers para reservas y atenciones.

## Canales

La aplicación se suscribe a canales privados `branch:{branch_id}`. Recepción escucha su sede. Admin escucha todas las sedes activas.

Antes de suscribirse, el cliente ejecuta `supabase.realtime.setAuth()` con la sesión vigente.

## Prueba

1. Abrir el centro de notificaciones.
2. Activar sonido.
3. Pulsar `Enviar evento de prueba`.
4. Debe aparecer `Evento Realtime de prueba` y sonar.

El Realtime Inspector puede verse vacío si no existe un cliente conectado al topic en ese momento.

## Debug

Configurar `NEXT_PUBLIC_REALTIME_DEBUG=true` para registrar topics, estados y eventos sin imprimir tokens.

## Push

Configurar `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Sin estas variables Broadcast sigue funcionando y la interfaz muestra `Push no configurado`.

## Recordatorios

Los recordatorios se programan con Supabase Cron mediante `supabase/sql/030_supabase_cron_reservation_reminders.sql`. El endpoint `/api/cron/reservation-reminders` queda únicamente como fallback o prueba manual.
