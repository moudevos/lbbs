# Portal externo MikroTik Hotspot

Este módulo registra visitas WiFi desde un portal estático de MikroTik y las muestra en el panel interno.

## Archivos estáticos

Los archivos fuente quedan en:

- `public/hotspot/login.html`
- `public/hotspot/hotspot.css`
- `public/hotspot/hotspot.js`

Para MikroTik, copiarlos manualmente a:

- `flash/hotspot/login.html`
- `flash/hotspot/hotspot.css`
- `flash/hotspot/hotspot.js`

No usan React ni Next.js. Son HTML, CSS y JS puros.

## API usada

El portal envía datos a:

```txt
https://labajaditabarberstudio.com/api/public/hotspot/visits
```

Payload esperado:

```json
{
  "branchCode": "SED-002",
  "name": "Cliente",
  "phone": "955131793",
  "acceptedTerms": true,
  "acceptedMarketing": true,
  "source": "mikrotik_hotspot",
  "mac": "$(mac)",
  "ip": "$(ip)",
  "username": "$(username)",
  "linkLoginOnly": "$(link-login-only)",
  "linkOrig": "$(link-orig)"
}
```

La API valida nombre, celular peruano de 9 dígitos, sede y consentimientos. Si el cliente ya existe por celular normalizado, no lo duplica.

## Configuración de sede

El archivo soporta sede por query param:

```txt
login.html?branch=SED-001
login.html?branch=SED-002
```

Si no llega `branch`, el JS usa `DEFAULT_BRANCH_CODE`. Cambiar en `public/hotspot/hotspot.js` antes de copiar al MikroTik si corresponde.

## Usuario guest MikroTik

El `login.html` incluye un formulario oculto:

```html
<form id="mikrotik-login-form" method="post" action="$(link-login-only)">
  <input type="hidden" name="username" value="guest" />
  <input type="hidden" name="password" value="guest" />
  <input type="hidden" name="dst" value="$(link-orig)" />
  <input type="hidden" name="popup" value="true" />
</form>
```

Configurar en MikroTik un usuario Hotspot `guest` con la política, límite y tiempo definidos por operación. Si se usa trial login o bypass, ajustar este formulario según la configuración real.

## Prueba local

1. Abrir `http://localhost:3001/hotspot/login.html`.
2. Seleccionar sede.
3. Ingresar nombre y WhatsApp.
4. Aceptar términos y publicidad.
5. Enviar.
6. Verificar que la API responda `ok: true`.

En local, el envío al formulario MikroTik puede no completar navegación porque las variables `$(link-login-only)` no existen fuera del router. Eso es esperado.

## Dashboard

Las visitas se revisan en:

```txt
/app/control/hotspot-visitas
```

Permisos:

- `admin`: todas las sedes o sede filtrada.
- `recepcion`: solo su sede.

La vista incluye filtros por fecha, sede, texto y consentimiento, métricas y exportación XLSX.

## SQL requerido

Ejecutar:

```txt
supabase/sql/036_hotspot_visits.sql
```

Crea `hotspot_visits`, índices y columnas de consentimiento en `customers`.

## Verificación rápida en Supabase

```sql
select *
from public.hotspot_visits
order by visited_at desc
limit 20;
```

## Caché de MikroTik/navegador

Si MikroTik sigue mostrando una versión antigua:

1. Reemplazar los tres archivos en `flash/hotspot/`.
2. Reiniciar el servicio Hotspot si aplica.
3. Borrar caché del navegador del teléfono.
4. Probar en modo incógnito.

## Seguridad

- No se expone `SUPABASE_SERVICE_ROLE_KEY` en el portal.
- La API pública usa servidor Next.js.
- Hay rate limit básico por IP/celular.
- Si la API falla, el JS no libera internet y muestra error.
- No pegar credenciales reales en documentación, issues, commits ni chats.
