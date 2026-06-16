insert into branches (code, name, address, phone) values
('SED-001', 'Sede 1', 'Dirección pendiente', '999999999'),
('SED-002', 'Sede 2', 'Dirección pendiente', '999999998')
on conflict (code) do nothing;

insert into services (sku, name, description, duration_minutes, price) values
('SRV-0001', 'Corte clásico', 'Corte tradicional', 30, 20),
('SRV-0002', 'Corte + barba', 'Corte y perfilado de barba', 45, 35),
('SRV-0003', 'Barba', 'Barba completa', 20, 15),
('SRV-0004', 'Perfilado', 'Perfilado de contornos', 20, 15),
('CUSTOM', 'Servicio personalizado', 'Servicio a medida', 60, null)
on conflict (sku) do nothing;

insert into whatsapp_templates (key, name, body) values
('primer_contacto', 'Primer contacto', 'Hola {cliente}, somos La Bajadita Barber Shop. Te escribimos para coordinar tu reserva en {sede}. Servicio solicitado: {servicio}. ¿Nos confirmas disponibilidad para el día {fecha} a las {hora}?'),
('confirmacion', 'Confirmación', 'Hola {cliente}, tu reserva en La Bajadita Barber Shop queda confirmada para el día {fecha} a las {hora}. Sede: {sede}. Barbero: {barbero}. Servicio: {servicio}. Precio: S/ {precio}.'),
('agradecimiento', 'Agradecimiento', 'Gracias por visitarnos, {cliente}. Esperamos que hayas disfrutado tu servicio en La Bajadita Barber Shop. Te esperamos pronto.'),
('cancelacion', 'Cancelación', 'Hola {cliente}, te escribimos de La Bajadita Barber Shop para informarte que tu reserva del día {fecha} a las {hora} fue cancelada. Podemos ayudarte a reprogramarla.'),
('recordatorio', 'Recordatorio', 'Hola {cliente}, te recordamos tu reserva en La Bajadita Barber Shop para el día {fecha} a las {hora}. Sede: {sede}. Servicio: {servicio}.')
on conflict (key) do nothing;
