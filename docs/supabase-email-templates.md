# Supabase Auth Email Templates

## Plantilla recomendada

Asunto:

```text
Activa tu acceso a La Bajadita Barber Shop
```

Contenido sugerido:

```html
<h2>Bienvenido a La Bajadita Barber Shop</h2>
<p>Se ha creado tu acceso al panel interno.</p>
<p>Para activarlo, valida tu correo con el siguiente boton:</p>
<p><a href="{{ .ConfirmationURL }}">Validar correo</a></p>
<p>Luego ingresa al sistema con la contraseña temporal entregada por administracion.</p>
<p>Por seguridad, el sistema te pedira cambiar esa contraseña en el primer ingreso.</p>
<p>Firma: La Bajadita Barber Shop</p>
```

## Reglas de seguridad

- No incluir claves reales en plantillas.
- No pegar `SUPABASE_SERVICE_ROLE_KEY`.
- No compartir contraseñas temporales por canales publicos.
- Para produccion, configurar SMTP y URL de redireccion hacia `/app/auth/callback`.
