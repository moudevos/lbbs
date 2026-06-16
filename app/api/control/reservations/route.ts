import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateRangeForDay } from "@/lib/reservations/time";
import { mapReservation } from "@/lib/reservations/mapper";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { writeAuditLog } from "@/lib/audit";
import { addMinutes, overlaps, toLocalDateTime } from "@/lib/reservations/time";
import { findOrCreateCustomerByPhone, assertReservationCanBeConfirmed } from "@/lib/reservations/server";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";
import type { ReservationStatus } from "@/lib/reservations/types";

type CreateInternalReservationBody = {
  branchId?: string;
  customerPhone?: string;
  customerName?: string;
  serviceId?: string;
  customServiceName?: string;
  employeeId?: string | null;
  date?: string;
  time?: string;
  price?: number | null;
  observations?: string | null;
  status?: ReservationStatus;
};

const initialStatuses: ReservationStatus[] = ["pendiente", "contactado", "confirmado"];

export async function GET(request: NextRequest) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const status = searchParams.get("status");
  const branchId = searchParams.get("branch_id") ?? searchParams.get("branchId");
  const barberId = searchParams.get("barberId");
  const range = dateRangeForDay(date);
  const admin = createAdminClient();

  let query = admin
    .from("reservations")
    .select("id,status,source,starts_at,ends_at,price,observations,branches(name,phone),customers(full_name,phone),services(name),employees(first_name,last_name)")
    .gte("starts_at", range.from)
    .lte("starts_at", range.to)
    .order("starts_at", { ascending: true });

  if (status) query = query.eq("status", status);
  if (barberId) query = query.eq("employee_id", barberId);

  const scope = resolveBranchScope(employee, branchId);

  if (employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else if (employee.role === "recepcion") {
    if (!employee.branchId) return NextResponse.json({ error: "Usuario sin sede" }, { status: 403 });
    query = query.eq("branch_id", employee.branchId);
  } else {
    query = query.eq("employee_id", employee.employeeId);
  }

  const [reservations, template] = await Promise.all([
    query,
    admin.from("whatsapp_templates").select("body").eq("key", "primer_contacto").maybeSingle()
  ]);

  if (reservations.error) {
    return NextResponse.json({ error: reservations.error.message }, { status: 500 });
  }

  return NextResponse.json({
    reservations: (reservations.data ?? []).map((reservation) => mapReservation(reservation as never, template.data?.body))
  });
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentEmployee();

  if (!actor) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (actor.role === "barbero") {
    return NextResponse.json({ error: "Barbero no puede crear reservas" }, { status: 403 });
  }

  const body = (await request.json()) as CreateInternalReservationBody;
  const status = body.status ?? "pendiente";

  if (!initialStatuses.includes(status)) {
    return NextResponse.json({ error: "Estado inicial invalido" }, { status: 400 });
  }

  const branchId = actor.role === "admin" ? body.branchId : actor.branchId;

  if (!branchId || !body.customerPhone || !body.customerName || !body.serviceId || !body.date || !body.time) {
    return NextResponse.json({ error: "Sede, cliente, servicio, fecha y hora son requeridos" }, { status: 400 });
  }

  if (!isValidPeruMobilePhone(body.customerPhone)) {
    return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: service, error: serviceError } = await admin
    .from("services")
    .select("id,sku,name,duration_minutes,price,branch_id")
    .eq("id", body.serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: serviceError?.message ?? "Servicio no encontrado" }, { status: 404 });
  }

  if (service.branch_id && service.branch_id !== branchId) {
    return NextResponse.json({ error: "Servicio fuera de la sede seleccionada" }, { status: 400 });
  }

  const isCustom = service.sku === "CUSTOM" || Boolean(body.customServiceName);
  const price = isCustom ? body.price ?? null : service.price;

  if (status === "confirmado" && price === null) {
    return NextResponse.json({ error: "No se puede confirmar un servicio personalizado sin precio" }, { status: 400 });
  }

  const startsAt = toLocalDateTime(body.date, body.time);
  const endsAt = addMinutes(startsAt, service.duration_minutes || 60);

  const confirmationError = status === "confirmado"
    ? await assertReservationCanBeConfirmed({ admin, employeeId: body.employeeId, startsAt, endsAt, price })
    : null;
  if (confirmationError) return confirmationError;

  let overlapWarning = false;
  if (body.employeeId) {
    const range = dateRangeForDay(body.date);
    const { data: existing, error } = await admin
      .from("reservations")
      .select("starts_at,ends_at,status")
      .eq("employee_id", body.employeeId)
      .gte("starts_at", range.from)
      .lte("starts_at", range.to)
      .in("status", ["pendiente", "contactado"]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    overlapWarning = (existing ?? []).some((reservation) =>
      overlaps(startsAt, endsAt, new Date(reservation.starts_at), new Date(reservation.ends_at))
    );
  }

  const customerResult = await findOrCreateCustomerByPhone({
    admin,
    phone: body.customerPhone,
    fullName: body.customerName,
    branchId
  });

  if (customerResult.error || !customerResult.customer) {
    return NextResponse.json({ error: customerResult.error ?? "No se pudo resolver el cliente" }, { status: 500 });
  }

  const observations = [body.observations, isCustom && body.customServiceName ? `Servicio personalizado: ${body.customServiceName}` : null]
    .filter(Boolean)
    .join("\n");

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      branch_id: branchId,
      customer_id: customerResult.customer.id,
      service_id: body.serviceId,
      employee_id: body.employeeId || null,
      status,
      source: "interno",
      price,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      observations: observations || null
    })
    .select("id")
    .single();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: "create",
    tableName: "reservations",
    recordId: reservation.id,
    newData: {
      source: "interno",
      status,
      branch_id: branchId,
      customer_created: customerResult.created,
      customer_reused: !customerResult.created,
      customer_name_differs: customerResult.nameDiffers,
      employee_id: body.employeeId || null,
      price,
      overlap_warning: overlapWarning
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({
    reservationId: reservation.id,
    overlapWarning,
    customer: customerResult.customer,
    customerCreated: customerResult.created,
    customerNameDiffers: customerResult.nameDiffers
  });
}
