# Supabase Cron para recordatorios

## Motivo

Los recordatorios se ejecutan cerca de los datos y no dependen de un despliegue o plan de Vercel. Supabase Cron usa `pg_cron`; el proyecto deja `pg_net` habilitado para futuras entregas HTTP o Push.

## Instalación

Ejecutar en Supabase SQL Editor:

```txt
supabase/sql/030_supabase_cron_reservation_reminders.sql
```

La función usa `America/Lima`, procesa reservas confirmadas próximas a 20 minutos y usa la restricción única de `reservation_reminders` para evitar duplicados.

## Prueba manual

```sql
select public.process_reservation_reminders();
```

Después verificar:

```sql
select * from reservation_reminders order by created_at desc;
select * from notification_events order by created_at desc;
```

## Verificar el job

```sql
select * from cron.job;
```

## Ver ejecuciones

```sql
select *
from cron.job_run_details
order by start_time desc
limit 20;
```

## Desactivar

```sql
select cron.unschedule('lbbs-reservation-reminders-every-5-min');
```

## Prueba desde la aplicación

El endpoint `POST /api/control/notifications/test-reminder` crea un evento de recordatorio para la sede actual. Debe aparecer en el centro de notificaciones, llegar por Broadcast y reproducir sonido si está habilitado.

`/api/cron/reservation-reminders` se conserva únicamente como fallback y prueba manual. No existe una programación Vercel asociada.
