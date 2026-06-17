# Checklist SEO Landing - La Bajadita Barber Studio

## Preparacion

1. Subir el proyecto a Vercel.
2. Configurar el dominio final o dominio preview de QA.
3. Configurar `NEXT_PUBLIC_APP_URL` con el dominio publico final, sin slash final.
4. Agregar dominio en Supabase Auth si afecta rutas publicas o callbacks.
5. Verificar `/`, `/reservar` y `/agenda`.

## Archivos publicos SEO

1. Abrir `/sitemap.xml`.
2. Confirmar que solo incluya rutas publicas.
3. Abrir `/robots.txt`.
4. Confirmar que bloquea `/app/control`, `/api`, `/local`, `/app/login` y rutas privadas.
5. Confirmar que `robots.txt` referencia el sitemap correcto.

## Metadata

1. Verificar title: `La Bajadita Barber Studio | Barbería premium en Iquitos`.
2. Verificar description orientada a barberia premium en Iquitos.
3. Verificar canonical con el dominio correcto.
4. Verificar Open Graph.
5. Verificar Twitter Card.
6. Confirmar que no aparezca `localhost` en produccion.

## Structured Data

1. Probar la URL en Rich Results Test.
2. Confirmar JSON-LD de negocio local/barberia.
3. Confirmar que `aggregateRating` solo aparece si hay resenas aprobadas reales visibles.
4. Confirmar que servicios del marcado existen en la seccion visible.
5. Confirmar que telefono, sedes y redes no usan datos inventados.

## Performance

1. Ejecutar PageSpeed Insights mobile y desktop.
2. Revisar LCP del hero.
3. Confirmar que la primera imagen hero es prioritaria.
4. Confirmar que imagenes de trabajo/equipo cargan lazy.
5. Revisar CLS por imagenes sin dimension.
6. Verificar que servicios/equipo/resenas aparecen en HTML inicial.
7. Revisar que no haya fetch client-side duplicado para contenido SEO clave.

## Google Search Console

1. Crear o verificar propiedad del dominio.
2. Enviar `/sitemap.xml`.
3. Inspeccionar URL principal `/`.
4. Solicitar indexacion si corresponde.
5. Monitorear cobertura e indexacion.
6. Revisar Core Web Vitals.

## Google Business Profile

1. Crear o actualizar Google Business Profile.
2. Usar nombre real: `La Bajadita Barber Studio`.
3. Agregar categoria principal relacionada a barberia.
4. Agregar direccion y zona de atencion en Iquitos, Loreto.
5. Agregar telefono/WhatsApp real.
6. Agregar enlace de reserva `/reservar`.
7. Subir fotos reales.
8. Pedir resenas reales a clientes.
9. No inventar reviews ni ratings.

## Validacion tecnica

Ejecutar antes de publicar:

```bash
npm run lint
npm run build
```

Si `npm run smoke:supabase` falla por falta de admin QA, documentarlo en el checklist de despliegue QA. Este sprint SEO no modifica datos internos del dashboard.

## Imagen futura para footer

Ruta esperada:

```txt
public/landing/footer/footer-bg.webp
```

Medidas recomendadas:

- Formato: WebP.
- Tamaño ideal desktop: 1920x720 px.
- Tamaño mínimo aceptable: 1600x600 px.
- Relación aproximada: 8:3 o 16:6.
- Peso recomendado: menor a 350 KB.
- Composición: dejar zona central/izquierda sin rostros importantes porque tendrá texto encima.
- Estilo: barbería oscura, luces cálidas, negro/oro, desenfoque suave.
- Mientras no exista: usar fondo negro sólido.
