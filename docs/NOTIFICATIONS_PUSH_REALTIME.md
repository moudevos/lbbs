# Notificaciones operativas

## Arquitectura

El sistema usa tres capas complementarias:

- Supabase Realtime Broadcast actualiza dashboard y dispositivos abiertos.
- El toast persistente conserva hasta cinco avisos durante la navegación.
- Web Push muestra avisos con la PWA cerrada o en segundo plano.

Los eventos se guardan en `notification_events`. El identificador del registro se
usa para evitar duplicados entre fetch, Broadcast y Push. Limpiar o descartar una
notificación escribe `dismissed_at`, por lo que no vuelve a aparecer.

## Variables VAPID

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@labajaditabarberstudio.com
```

Si faltan, Realtime sigue operativo y la interfaz indica que Push no está
configurado. Las claves privadas se configuran únicamente en el entorno del
servidor.

## Instalación

1. Ejecutar `031_push_realtime_notifications_dashboard_devices.sql`.
2. Ejecutar `032_supabase_cron_push_reminders.sql`.
3. Configurar las variables VAPID en Vercel.
4. Instalar la PWA o permitir notificaciones desde el navegador.
5. Pulsar `Activar notificaciones` en dashboard o dispositivo.

## Pruebas

- Dashboard: abrir el centro y pulsar `Enviar evento de prueba`.
- Local: iniciar sesión y pulsar `Enviar prueba local`.
- Recordatorio manual:

```sql
select public.process_reservation_reminders();
```

- Ver jobs:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

- Desactivar:

```sql
select cron.unschedule('lbbs-reservation-reminders-every-5-min');
```

## Diagnóstico

Si Push no llega, revisar el permiso del sitio en el navegador, la configuración
de notificaciones del sistema operativo, el service worker y las claves VAPID.
Push depende del permiso del navegador y del sistema. Realtime requiere una
sesión autenticada en dashboard; dispositivos usan el canal público limitado a
su sede y el token local para registrar la suscripción.
