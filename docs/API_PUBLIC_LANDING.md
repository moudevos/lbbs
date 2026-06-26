# APIs publicas para Landing Astro

Rutas agregadas en Next para que Astro consuma datos sin Supabase directo:

```txt
GET /api/public/landing/services
GET /api/public/landing/team
GET /api/public/landing/gallery
GET /api/public/landing/branches
GET /api/public/landing/reviews
GET /api/public/landing/settings
```

Todas responden con:

```txt
Cache-Control: public, s-maxage=300, stale-while-revalidate=3600
```

## Seguridad

- No requieren sesion.
- No devuelven datos sensibles.
- Solo devuelven datos activos o publicables.
- Las imagenes deben usar URLs publicas, no signed URLs temporales.
