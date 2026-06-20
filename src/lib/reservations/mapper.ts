import { buildWhatsAppUrl } from "./whatsapp";
import type { ReservationSummary } from "./types";
import { buildWhatsAppUrlForStatus, type WhatsAppTemplateMap } from "@/lib/whatsapp/build-whatsapp-message";

type ReservationRow = {
  id: string;
  status: ReservationSummary["status"];
  source: string;
  created_at: string;
  contacted_at?: string | null;
  branch_id: string;
  service_id: string | null;
  employee_id: string | null;
  starts_at: string;
  ends_at: string;
  price: number | null;
  observations: string | null;
  branches?: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;
  customers?: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
  services?: { name: string | null } | { name: string | null }[] | null;
  employees?: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
  service_orders?: { id: string | null } | { id: string | null }[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function mapReservation(row: ReservationRow, template?: string | null, templates?: WhatsAppTemplateMap): ReservationSummary {
  const branch = first(row.branches);
  const customer = first(row.customers);
  const service = first(row.services);
  const employee = first(row.employees);
  const serviceOrder = first(row.service_orders);
  const barber = employee ? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() : null;
  const branchName = branch?.name ?? "Sede";
  const customerName = customer?.full_name ?? "Cliente";
  const serviceName = service?.name ?? "Servicio";

  const date = new Date(row.starts_at);
  const statusWhatsApp = templates
    ? buildWhatsAppUrlForStatus({
        phone: customer?.phone ?? branch?.phone ?? null,
        templates,
        context: {
          customer: customerName,
          branch: branchName,
          date: date.toLocaleDateString("es-PE"),
          time: date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
          barber,
          service: serviceName,
          price: row.price,
          branchPhone: branch?.phone ?? null,
          status: row.status
        }
      })
    : null;

  return {
    id: row.id,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    contactedAt: row.contacted_at ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    price: row.price,
    observations: row.observations,
    branch: branchName,
    branchId: row.branch_id,
    branchPhone: branch?.phone ?? null,
    customer: customerName,
    customerPhone: customer?.phone ?? "",
    service: serviceName,
    serviceId: row.service_id,
    barber,
    barberId: row.employee_id,
    serviceOrderId: serviceOrder?.id ?? null,
    whatsappUrl: statusWhatsApp?.url || buildWhatsAppUrl({
      phone: customer?.phone ?? branch?.phone ?? null,
      template,
      customer: customerName,
      branch: branchName,
      dateIso: row.starts_at,
      barber,
      service: serviceName,
      price: row.price
    }),
    whatsappTemplateMissing: statusWhatsApp?.missingTemplateKey ?? null
  };
}
