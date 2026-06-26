# Arquitectura La Bajadita Barber Studio

El sistema queda dividido en dos proyectos:

- `lbbs-landing-astro`: landing publico, SEO, contenido comercial y performance.
- `lbbs`: sistema operativo Next.js con reservas, dashboard, APIs, Supabase, dispositivos y hotspot.

## Dominios

```txt
labajaditabarberstudio.com              -> Astro landing
control.labajaditabarberstudio.com      -> Next dashboard
reservas.labajaditabarberstudio.com     -> Next reservas
dispositivos.labajaditabarberstudio.com -> Next dispositivos
```

No asignar el dominio raiz a los dos proyectos Vercel al mismo tiempo.

## Next.js

Mantiene reservas, dashboard, caja, atenciones, produccion, rewards, liquidaciones, APIs, Supabase y hotspot MikroTik.

## Astro

Contiene solo el landing publico y consume APIs publicas de Next. No usa credenciales Supabase.
