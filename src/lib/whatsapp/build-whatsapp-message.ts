import type { ReservationStatus } from "@/lib/reservations/types";

export type WhatsAppTemplateMap = Partial<Record<string, string>>;

export type WhatsAppReservationContext = {
  customer: string;
  branch: string;
  date: string;
  time: string;
  barber?: string | null;
  service: string;
  price?: number | null;
  branchPhone?: string | null;
  status: ReservationStatus;
};

export function templateKeyForReservationStatus(status: ReservationStatus) {
  const map: Record<ReservationStatus, string> = {
    pendiente: "primer_contacto",
    contactado: "seguimiento",
    confirmado: "recordatorio",
    atendido: "agradecimiento",
    cancelado: "cancelacion",
    no_asistio: "no_asistio"
  };
  return map[status];
}

export function buildWhatsAppMessage(template: string, context: WhatsAppReservationContext) {
  return template
    .replaceAll("{cliente}", context.customer)
    .replaceAll("{sede}", context.branch)
    .replaceAll("{fecha}", context.date)
    .replaceAll("{hora}", context.time)
    .replaceAll("{barbero}", context.barber || "Por asignar")
    .replaceAll("{servicio}", context.service)
    .replaceAll("{precio}", context.price == null ? "Por confirmar" : String(context.price))
    .replaceAll("{telefono_sede}", context.branchPhone || "")
    .replaceAll("{estado}", context.status);
}

export function buildWhatsAppUrlForStatus({
  phone,
  templates,
  context
}: {
  phone?: string | null;
  templates: WhatsAppTemplateMap;
  context: WhatsAppReservationContext;
}) {
  const key = templateKeyForReservationStatus(context.status);
  const template = templates[key];
  if (!template || !phone) return { url: "", missingTemplateKey: key };
  return {
    url: `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(buildWhatsAppMessage(template, context))}`,
    missingTemplateKey: null
  };
}
