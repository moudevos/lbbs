import { formatDate, formatTime } from "./time";

type WhatsAppInput = {
  phone: string | null;
  template?: string | null;
  customer: string;
  branch: string;
  dateIso: string;
  barber?: string | null;
  service: string;
  price?: number | null;
};

const fallbackTemplate =
  "Hola {cliente}, somos La Bajadita Barber Shop. Te escribimos para coordinar tu reserva en {sede}. Servicio solicitado: {servicio}. ¿Nos confirmas disponibilidad para el dia {fecha} a las {hora}?";

export function buildWhatsAppUrl(input: WhatsAppInput) {
  const phone = (input.phone ?? "").replace(/\D/g, "");
  const template = input.template || fallbackTemplate;
  const text = template
    .replaceAll("{cliente}", input.customer)
    .replaceAll("{sede}", input.branch)
    .replaceAll("{fecha}", formatDate(input.dateIso))
    .replaceAll("{hora}", formatTime(input.dateIso))
    .replaceAll("{barbero}", input.barber ?? "Por asignar")
    .replaceAll("{servicio}", input.service)
    .replaceAll("{precio}", input.price == null ? "Por confirmar" : String(input.price))
    .replaceAll("{telefono_sede}", phone || "Por confirmar");

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
