import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireEmployee } from "@/lib/control/api";

const fallbackTemplate =
  "Gracias por visitarnos, {cliente}. Fue un gusto atenderte en La Bajadita Barber Studio. Esperamos que hayas disfrutado tu {servicio}; cuando quieras renovar tu estilo, aqui estaremos.";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const { data: order, error } = await context.admin
    .from("service_orders")
    .select(
      "id,status,branch_id,employee_id,total,created_at,attended_at,paid_at,branches(id,name,phone),customers(id,full_name,phone),employees(id,first_name,last_name),service_order_items(item_type,name,description,quantity)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Atencion no encontrada" }, { status: 404 });
  }

  const row = order as any;
  const branch = first(row.branches);
  const customer = first(row.customers);
  const barber = first(row.employees);

  if (context.employee.role === "recepcion" && branch?.id !== context.employee.branchId) {
    return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  }
  if (context.employee.role === "barbero" && barber?.id !== context.employee.employeeId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const phone = normalizePeruPhone(customer?.phone);
  if (!phone) {
    return NextResponse.json({ error: "El cliente no tiene un celular valido registrado" }, { status: 400 });
  }

  const { data: templateRow } = await context.admin
    .from("whatsapp_templates")
    .select("body,is_active")
    .eq("key", "agradecimiento")
    .maybeSingle();

  const template = templateRow?.is_active !== false && templateRow?.body ? templateRow.body : fallbackTemplate;
  const date = row.attended_at ?? row.paid_at ?? row.created_at;
  const services = serviceSummary(row.service_order_items ?? []);
  const message = buildMessage(template, {
    cliente: customer?.full_name ?? "cliente",
    sede: branch?.name ?? "La Bajadita",
    fecha: date ? new Date(date).toLocaleDateString("es-PE", { timeZone: "America/Lima" }) : "",
    hora: date ? new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }) : "",
    barbero: barber ? `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim() : "nuestro equipo",
    servicio: services,
    precio: `S/ ${Number(row.total ?? 0).toFixed(2)}`,
    telefono_sede: branch?.phone ?? ""
  });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_orders",
    recordId: params.id,
    newData: {
      event: "thank_you_whatsapp_link_generated",
      customer_id: customer?.id ?? null,
      template_key: "agradecimiento"
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({
    url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  });
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizePeruPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) return "";
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

function serviceSummary(items: any[]) {
  const names = items
    .filter((item) => ["service", "custom_service", "manual_extra"].includes(item.item_type))
    .map((item) => item.name ?? item.description)
    .filter(Boolean);
  if (names.length === 0) return "servicio";
  if (names.length <= 2) return names.join(" y ");
  return `${names.slice(0, 2).join(", ")} y otros servicios`;
}

function buildMessage(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}
