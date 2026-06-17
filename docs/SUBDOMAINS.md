# Subdominios de La Bajadita Barber Studio

Todos los dominios apuntan al mismo proyecto Next.js desplegado en Vercel.

| Dominio | Ruta inicial |
| --- | --- |
| `labajaditabarberstudio.com` | `/` |
| `reservas.labajaditabarberstudio.com` | `/reservar` |
| `control.labajaditabarberstudio.com` | `/app/login` o `/app/control` con sesión |
| `resenas.labajaditabarberstudio.com` | `/cliente/resena` |
| `dispositivos.labajaditabarberstudio.com` | `/local/login` |

La redirección se aplica únicamente cuando el pathname es `/`. Assets, imágenes, APIs y archivos públicos no son interceptados. Los subdominios internos reciben `X-Robots-Tag: noindex`.

## Vercel

Agregar los cinco dominios al mismo proyecto. Mantener:

```env
NEXT_PUBLIC_APP_URL=https://labajaditabarberstudio.com
```

No cambiar la URL canónica al subdominio. El canonical corresponde únicamente al landing principal.

## DNS

Crear los registros indicados por Vercel. Normalmente:

```txt
reservas      CNAME  cname.vercel-dns.com
control       CNAME  cname.vercel-dns.com
resenas       CNAME  cname.vercel-dns.com
dispositivos  CNAME  cname.vercel-dns.com
```

El dominio raíz debe conservar el registro A o ALIAS proporcionado por Vercel. Confirmar siempre los valores exactos mostrados en el panel del proyecto.

## Supabase Auth

En Authentication > URL Configuration mantener como Site URL:

```txt
https://labajaditabarberstudio.com
```

Agregar Redirect URLs:

```txt
https://labajaditabarberstudio.com/app/auth/callback
https://control.labajaditabarberstudio.com/app/auth/callback
https://control.labajaditabarberstudio.com/app/control
```

Para desarrollo puede mantenerse la URL local correspondiente. No usar wildcards más amplios de lo necesario.

## Pruebas

Después del despliegue verificar:

```txt
https://labajaditabarberstudio.com
https://reservas.labajaditabarberstudio.com
https://control.labajaditabarberstudio.com
https://resenas.labajaditabarberstudio.com
https://dispositivos.labajaditabarberstudio.com
```

