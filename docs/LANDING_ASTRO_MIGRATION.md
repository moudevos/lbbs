# Migracion Landing a Astro

Se creo el proyecto hermano:

```txt
../lbbs-landing-astro
```

Incluye Astro, TypeScript, Tailwind, componentes del landing, paleta dorada nueva, SEO, sitemap, robots y consumo de APIs publicas del proyecto Next.

## Regla visual

La migracion mantiene estructura visual 1:1. No se redisenan secciones. Solo se mapea el dorado a la nueva paleta:

```css
--color-gold-500: #ffd700;
--color-gold-600: #d1a000;
```

## Reservas

La opcion activa inicial es usar subdominio:

```env
PUBLIC_RESERVATION_URL=https://reservas.labajaditabarberstudio.com
```

No se implemento rewrite `/reservar` en Astro en esta fase.

## Pendientes

- Prueba visual en Vercel Preview.
- Optimizar hero a WebP/AVIF.
- Confirmar dominio raiz en Astro.
