# Portal externo MikroTik Hotspot

Este modulo registra visitas WiFi desde un portal estatico de MikroTik y las muestra en el panel interno de La Bajadita Barber Studio.

## Ubicaciones

Referencia original del router:

```txt
mikrotik/hotspot-original/hotspot
```

Version final adaptada para copiar al router:

```txt
mikrotik/hotspot-lbbs
```

Version publica base para pruebas locales:

```txt
public/hotspot
```

## Archivos originales necesarios

Del paquete original se conservan estos archivos porque forman parte del flujo real de MikroTik Hotspot:

- `login.html`: redisenado para capturar datos y autenticar.
- `alogin.html`: pantalla de login aceptado y redireccion.
- `rlogin.html`: redireccion requerida por algunos clientes cautivos.
- `status.html`: estado de sesion.
- `logout.html`: cierre de sesion.
- `error.html`: errores Hotspot.
- `redirect.html`: redireccion simple.
- `radvert.html`: pagina de advertencia si RouterOS la usa.
- `md5.js`: requerido si el Hotspot usa CHAP.
- `errors.txt`: textos de errores RouterOS.
- `api.json`: metadata del portal.
- `xml/`: respuestas WISP/XML para deteccion de portales cautivos.
- `img/`: assets usados por paginas auxiliares.
- `css/style.css`: estilo base usado por paginas auxiliares.

## Archivos adaptados

- `mikrotik/hotspot-lbbs/login.html`: portal principal negro/oro con sede, nombre, WhatsApp y consentimientos.
- `mikrotik/hotspot-lbbs/css/hotspot.css`: estilos propios de La Bajadita para el login.
- `mikrotik/hotspot-lbbs/hotspot.js`: validacion, llamada a API publica y envio posterior del login MikroTik.
- `public/hotspot/login.html`: version publica base equivalente.
- `public/hotspot/hotspot.css`: CSS publico.
- `public/hotspot/hotspot.js`: JS publico.
- `public/hotspot/md5.js`: soporte CHAP para pruebas publicas.

## API usada

El portal envia datos a:

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

La API valida nombre, celular peruano de 9 digitos, sede y consentimientos. Si el cliente ya existe por celular normalizado, no lo duplica.

Importante para MikroTik: antes del login, el cliente aun no tiene internet completo. Configurar Walled Garden para permitir al menos:

```txt
labajaditabarberstudio.com
https://labajaditabarberstudio.com/api/public/hotspot/visits
```

Si el Walled Garden no permite llegar a la API, el portal mostrara error y no liberara internet.

## Variables MikroTik preservadas

El login mantiene estas variables del Hotspot:

- `$(link-login-only)`
- `$(link-orig)`
- `$(mac)`
- `$(ip)`
- `$(username)`
- `$(error)`
- `$(chap-id)`
- `$(chap-challenge)`

No eliminarlas al editar el portal.

## Configuracion de sede

El archivo soporta sede por query param:

```txt
login.html?branch=SED-001
login.html?branch=SED-002
```

Si no llega `branch`, el JS usa `DEFAULT_BRANCH_CODE`. Cambiar en `mikrotik/hotspot-lbbs/hotspot.js` antes de copiar al MikroTik si corresponde.

## Usuario guest MikroTik

El `login.html` incluye un formulario oculto:

```html
<form name="login" id="mikrotik-login-form" action="$(link-login-only)" method="post">
  <input type="hidden" name="username" value="guest" />
  <input type="hidden" name="password" value="guest" />
  <input type="hidden" name="dst" value="$(link-orig)" />
  <input type="hidden" name="popup" value="true" />
</form>
```

Configurar en MikroTik un usuario Hotspot `guest` con la politica, limite y tiempo definidos por operacion.

Si el Hotspot usa CHAP, no eliminar `md5.js`. El login calcula:

```txt
hexMD5('$(chap-id)' + password + '$(chap-challenge)')
```

antes de enviar el formulario a `$(link-login-only)`.

## Copiar al MikroTik

Copiar el contenido completo de:

```txt
mikrotik/hotspot-lbbs
```

a:

```txt
flash/hotspot/
```

Debe quedar, como minimo:

```txt
flash/hotspot/login.html
flash/hotspot/hotspot.js
flash/hotspot/md5.js
flash/hotspot/css/style.css
flash/hotspot/css/hotspot.css
flash/hotspot/img/
flash/hotspot/xml/
flash/hotspot/alogin.html
flash/hotspot/rlogin.html
flash/hotspot/status.html
flash/hotspot/logout.html
flash/hotspot/error.html
flash/hotspot/redirect.html
flash/hotspot/radvert.html
flash/hotspot/errors.txt
flash/hotspot/api.json
```

No copiar solo `login.html`: las paginas auxiliares y `md5.js` son parte del flujo real del Hotspot.

## Prueba local

1. Abrir `http://localhost:3001/hotspot/login.html`.
2. Seleccionar sede.
3. Ingresar nombre y WhatsApp.
4. Aceptar terminos y publicidad.
5. Enviar.
6. Verificar que la API responda `ok: true`.

En local, el envio al formulario MikroTik puede no completar navegacion porque las variables `$(link-login-only)` no existen fuera del router. Eso es esperado.

## Prueba en MikroTik

1. Copiar todo `mikrotik/hotspot-lbbs` a `flash/hotspot/`.
2. Crear o validar el usuario Hotspot `guest`.
3. Conectar un celular a la red WiFi del Hotspot.
4. Abrir cualquier web para disparar el portal cautivo.
5. Completar sede, nombre, WhatsApp y consentimientos.
6. Confirmar que, si la API responde OK, el equipo queda autenticado.
7. Si la API falla, debe mostrarse error y no debe liberarse internet.

## Dashboard

Las visitas se revisan en:

```txt
/app/control/hotspot-visitas
```

Permisos:

- `admin`: todas las sedes o sede filtrada.
- `recepcion`: solo su sede.

La vista incluye filtros por fecha, sede, texto y consentimiento, metricas y exportacion XLSX.

Para validar el registro:

1. Entrar al panel interno.
2. Abrir `/app/control/hotspot-visitas`.
3. Filtrar por la sede usada.
4. Verificar nombre, celular, IP/MAC y estado nuevo/recurrente.

## SQL requerido

Ejecutar:

```txt
supabase/sql/036_hotspot_visits.sql
```

Crea `hotspot_visits`, indices y columnas de consentimiento en `customers`.

## Verificacion rapida en Supabase

```sql
select *
from public.hotspot_visits
order by visited_at desc
limit 20;
```

## Cache de MikroTik/navegador

Si MikroTik sigue mostrando una version antigua:

1. Reemplazar los archivos en `flash/hotspot/`.
2. Reiniciar el servicio Hotspot si aplica.
3. Borrar cache del navegador del telefono.
4. Probar en modo incognito.

## Seguridad

- No se expone `SUPABASE_SERVICE_ROLE_KEY` en el portal.
- La API publica usa servidor Next.js.
- Hay rate limit basico por IP/celular.
- Si la API falla, el JS no libera internet y muestra error.
- No pegar credenciales reales en documentacion, issues, commits ni chats.
