insert into public.whatsapp_templates (key, name, body)
values (
  'agradecimiento',
  'Agradecimiento',
  'Gracias por visitarnos, {cliente}. Fue un gusto atenderte en La Bajadita Barber Studio. Esperamos que hayas disfrutado tu {servicio}; cuando quieras renovar tu estilo, aqui estaremos.'
)
on conflict (key) do nothing;
