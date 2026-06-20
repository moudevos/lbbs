import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { addMinutes, dateRangeForDay, overlaps, toLocalDateTime } from "@/lib/reservations/time";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";
import { findOrCreateCustomerByPhone } from "@/lib/reservations/server";
import { validateOperationalSchedule } from "@/lib/reservations/availability";

type CreateReservationBody = {
  branchId: string;
  serviceId: string;
  employeeId?: string | null;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  observations?: string | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<CreateReservationBody>;

  if (!body.branchId || !body.serviceId || !body.customerName || !body.customerPhone || !body.date || !body.time) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (!isValidPeruMobilePhone(body.customerPhone)) {
    return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: service, error: serviceError } = await admin
    .from("services")
    .select("id,sku,duration_minutes,price,branch_id,is_active")
    .eq("id", body.serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: serviceError?.message ?? "Servicio no encontrado" }, { status: 404 });
  }
  if (!service.is_active || (service.branch_id && service.branch_id !== body.branchId)) {
    return NextResponse.json({ error: "El servicio no esta disponible en la sede seleccionada" }, { status: 400 });
  }

  const startsAt = toLocalDateTime(body.date, body.time);
  const endsAt = addMinutes(startsAt, service.duration_minutes || 60);
  const scheduleError = await validateOperationalSchedule({
    admin, branchId: body.branchId, employeeId: body.employeeId, date: body.date,
    time: body.time, durationMinutes: service.duration_minutes || 60
  });
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 409 });
  const range = dateRangeForDay(body.date);
  let overlapWarning = false;

  if (body.employeeId) {
    const { data: barber, error: barberError } = await admin
      .from("employees")
      .select("id,branch_id,is_active,role")
      .eq("id", body.employeeId)
      .maybeSingle();

    if (barberError || !barber) return NextResponse.json({ error: barberError?.message ?? "Barbero no encontrado" }, { status: 404 });
    if (barber.role !== "barbero" || !barber.is_active) {
      return NextResponse.json({ error: "Selecciona un barbero activo" }, { status: 400 });
    }
    if (barber.branch_id !== body.branchId) {
      return NextResponse.json({ error: "El barbero no pertenece a la sede seleccionada" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await admin
      .from("reservations")
      .select("starts_at,ends_at,status")
      .eq("employee_id", body.employeeId)
      .gte("starts_at", range.from)
      .lte("starts_at", range.to)
      .in("status", ["pendiente", "confirmado"]);

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    const confirmedOverlap = (existing ?? []).some(
      (reservation) =>
        reservation.status === "confirmado" &&
        overlaps(startsAt, endsAt, new Date(reservation.starts_at), new Date(reservation.ends_at))
    );

    if (confirmedOverlap) {
      return NextResponse.json({ error: "El barbero ya tiene una reserva confirmada en ese horario" }, { status: 409 });
    }

    overlapWarning = (existing ?? []).some(
      (reservation) =>
        reservation.status === "pendiente" &&
        overlaps(startsAt, endsAt, new Date(reservation.starts_at), new Date(reservation.ends_at))
    );
  }

  const customerResult = await findOrCreateCustomerByPhone({
    admin,
    phone: body.customerPhone,
    fullName: body.customerName,
    branchId: body.branchId
  });

  if (customerResult.error || !customerResult.customer) {
    return NextResponse.json({ error: customerResult.error ?? "No se pudo resolver el cliente" }, { status: 500 });
  }

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      branch_id: body.branchId,
      customer_id: customerResult.customer.id,
      service_id: body.serviceId,
      employee_id: body.employeeId || null,
      status: "pendiente",
      source: "publico",
      price: service.sku === "CUSTOM" ? null : service.price,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      observations: body.observations ?? null
    })
    .select("id")
    .single();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    eventType: "create",
    tableName: "reservations",
    recordId: reservation.id,
    newData: { source: "publico", status: "pendiente", employee_id: body.employeeId || null, created_without_barber: !body.employeeId, overlap_warning: overlapWarning, customer_created: customerResult.created },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({ reservationId: reservation.id, overlapWarning });
}
