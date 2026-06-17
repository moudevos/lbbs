# Plan SEO de La Bajadita Barber Studio

## Dominio oficial

La URL canónica es `https://labajaditabarberstudio.com`. En Vercel debe configurarse:

```env
NEXT_PUBLIC_APP_URL=https://labajaditabarberstudio.com
```

## Google Search Console

- Verificación HTML permanente: `/googled7834b81e8ad8c39.html`.
- Verificación meta opcional: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- Sitemap: `https://labajaditabarberstudio.com/sitemap.xml`.
- Robots: `https://labajaditabarberstudio.com/robots.txt`.
- Enviar el sitemap y revisar indexación con Inspección de URLs.

## Google Analytics 4

Configurar `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` en Vercel. Si está vacío no se carga ningún script. Revisar en DebugView los eventos de reserva, WhatsApp, galería, reseñas, servicios y barberos.

## Google Business Profile

- Verificar nombre, categoría, teléfonos, sedes, horarios y dominio.
- Mantener los datos consistentes con Supabase y el sitio.
- Publicar fotografías recientes y responder reseñas.

## Rendimiento y datos estructurados

- Revisar móvil y desktop en PageSpeed Insights.
- Validar el JSON-LD con Rich Results Test.
- Comprobar Core Web Vitals después de cada cambio importante de imágenes.

## Estrategia de reseñas

- Solicitar reseñas reales después de la atención.
- Moderar y mostrar únicamente reseñas aprobadas.
- No crear ratings ni testimonios ficticios.

## Estrategia de imágenes

- Usar WebP cuando sea posible.
- Mantener textos alternativos específicos por corte, servicio y barbero.
- Comprimir imágenes antes de subirlas y evitar archivos externos.

## Expansión futura

Crear páginas indexables con contenido único para servicios y sedes, por ejemplo cortes fade, barba y perfilado en Iquitos. Cada página debe tener canonical, metadata, imágenes propias, enlaces internos y datos reales de la sede.

