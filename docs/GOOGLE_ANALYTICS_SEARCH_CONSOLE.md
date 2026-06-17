# Google Analytics 4 y Search Console

## Google Analytics 4

1. Crear una propiedad GA4 para La Bajadita Barber Studio.
2. Crear un flujo web y copiar el Measurement ID con formato `G-XXXXXXXXXX`.
3. Configurar `NEXT_PUBLIC_GA_MEASUREMENT_ID` en las variables de entorno de Vercel.
4. Volver a desplegar. Si la variable no existe, el landing no carga scripts de Analytics.
5. Confirmar `page_view` y los eventos de reserva, WhatsApp, redes, galeria y reseñas desde DebugView o Tiempo real.

## Google Search Console

1. Crear la propiedad del dominio o la URL publica en Search Console.
2. Verificar preferentemente por DNS. Para verificacion por etiqueta HTML, copiar solo el token.
3. Configurar `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` en Vercel, sin hardcodearlo en el repositorio.
4. Confirmar que `NEXT_PUBLIC_APP_URL` use la URL HTTPS canonica de produccion, sin barra final.
5. Volver a desplegar y solicitar la verificacion.
6. Enviar `https://TU_DOMINIO/sitemap.xml`.
7. Revisar `robots.txt`, Rich Results Test e Inspeccion de URLs.
8. Solicitar indexacion de la portada si aun no aparece.
9. Revisar cobertura, consultas, Core Web Vitals y eventos de GA4 despues de la indexacion.

Variables:

```env
NEXT_PUBLIC_APP_URL=https://labajaditabarberstudio.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
```

No incluir tokens reales en commits, issues, chats o documentacion.
