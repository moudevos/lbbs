import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { addMinutes, toLocalDateTime } from "@/lib/reservations/time";
import type { ReservationStatus } from "@/lib/reservations/types";
import { assertReservationCanBeConfirmed } from "@/lib/reservations/server";
import { findOrCreateCustomerByPhone } from "@/lib/reservations/server";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";
import { validateOperationalSchedule } from "@/lib/reservations/availability";

type UpdateReservationBody = {
  status?: ReservationStatus;
  employeeId?: string | null;
  price?: number | null;
  date?: string;
  time?: string;
  observations?: string | null;
  customerName?: string;
  customerPhone?: string;
  serviceId?: string;
};

const allowedStatuses: ReservationStatus[] = ["pendiente", "contactado", "confirmado", "atendido", "cancelado", "no_asistio"];

type CurrentReservation = {
  id: string;
  branch_id: string;
  employee_id: string | null;
  service_id: string | null;
  status: ReservationStatus;
  starts_at: string;
  ends_at: string;
  price: number | null;
  observations: string | null;
  customer_id: string;
  services?: { duration_minutes: number | null } | { duration_minutes: number | null }[] | null;
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getCurrentEmployee();

  if (!actor) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (actor.role === "barbero") {
    return NextResponse.json({ error: "Barbero solo tiene lectura en este sprint" }, { status: 403 });
  }

  const body = (await request.json()) as UpdateReservationBody;
  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("reservations")
    .select("id,branch_id,customer_id,employee_id,service_id,status,starts_at,ends_at,price,observations,services(duration_minutes)")
    .eq("id", params.id)
    .maybeSingle();

  if (currentError || !current) {
    return NextResponse.json({ error: currentError?.message ?? "Reserva no encontrada" }, { status: 404 });
  }

  const reservation = current as unknown as CurrentReservation;

  if (actor.role === "recepcion" && reservation.branch_id !== actor.branchId) {
    return NextResponse.json({ error: "Reserva fuera de tu sede" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  const editsOperationalFields = body.customerName !== undefined || body.customerPhone !== undefined || body.serviceId !== undefined
    || body.employeeId !== undefined || body.date !== undefined || body.time !== undefined;
  if (editsOperationalFields && !["pendiente", "contactado"].includes(reservation.status)) {
    return NextResponse.json({ error: "La reserva confirmada o final solo puede reprogramarse" }, { status: 409 });
  }
  const newEmployeeId = body.employeeId !== undefined ? body.employeeId : reservation.employee_id;

  if (body.status) {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
    }
    if (body.status === "atendido") {
      return NextResponse.json({ error: "Usa la accion Confirmar atencion para marcar una reserva como atendida" }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "contactado" && reservation.status !== "contactado") patch.contacted_at = new Date().toISOString();
  }

  if (body.employeeId !== undefined) patch.employee_id = body.employeeId || null;
  if (body.price !== undefined) return NextResponse.json({ error: "El precio no se edita desde la reserva" }, { status: 400 });
  if (body.observations !== undefined) patch.observations = body.observations;

  let duration = Array.isArray(reservation.services)
    ? reservation.services[0]?.duration_minutes
    : reservation.services?.duration_minutes;
  if (body.serviceId !== undefined) {
    const { data: service, error: serviceError } = await admin
      .from("services").select("id,branch_id,duration_minutes,price,is_active").eq("id", body.serviceId).maybeSingle();
    if (serviceError || !service || !service.is_active) {
      return NextResponse.json({ error: serviceError?.message ?? "Servicio activo no encontrado" }, { status: 400 });
    }
    if (service.branch_id && service.branch_id !== reservation.branch_id) {
      return NextResponse.json({ error: "El servicio no pertenece a la sede" }, { status: 400 });
    }
    patch.service_id = service.id;
    patch.price = service.price;
    duration = service.duration_minutes;
  }

  if (body.customerPhone !== undefined || body.customerName !== undefined) {
    if (!body.customerPhone || !body.customerName || !isValidPeruMobilePhone(body.customerPhone)) {
      return NextResponse.json({ error: "Nombre y celular peruano valido son requeridos" }, { status: 400 });
    }
    const customer = await findOrCreateCustomerByPhone({
      admin, phone: body.customerPhone, fullName: body.customerName, branchId: reservation.branch_id
    });
    if (customer.error || !customer.customer) return NextResponse.json({ error: customer.error ?? "No se pudo resolver cliente" }, { status: 500 });
    patch.customer_id = customer.customer.id;
  }

  if (newEmployeeId) {
    const { data: barber, error: barberError } = await admin
      .from("employees")
      .select("id,branch_id,is_active,role")
      .eq("id", newEmployeeId)
      .maybeSingle();

    if (barberError || !barber) return NextResponse.json({ error: barberError?.message ?? "Barbero no encontrado" }, { status: 404 });
    if (barber.role !== "barbero" || !barber.is_active) {
      return NextResponse.json({ error: "Selecciona un barbero activo" }, { status: 400 });
    }
    if (barber.branch_id !== reservation.branch_id) {
      return NextResponse.json({ error: "El barbero no pertenece a la sede de la reserva" }, { status: 400 });
    }
  }

  if (body.date && body.time) {
    const startsAt = toLocalDateTime(body.date, body.time);
    const endsAt = addMinutes(startsAt, duration || 60);
    const scheduleError = await validateOperationalSchedule({
      admin, branchId: reservation.branch_id, employeeId: newEmployeeId,
      date: body.date, time: body.time, durationMinutes: duration || 60
    });
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 409 });
    patch.starts_at = startsAt.toISOString();
    patch.ends_at = endsAt.toISOString();
  }

  const targetStatus = (patch.status as ReservationStatus | undefined) ?? reservation.status;
  const targetStart = new Date((patch.starts_at as string | undefined) ?? reservation.starts_at);
  const targetEnd = new Date((patch.ends_at as string | undefined) ?? reservation.ends_at);

  if (targetStatus === "confirmado") {
    const confirmationError = await assertReservationCanBeConfirmed({
      admin,
      reservationId: params.id,
      employeeId: newEmployeeId,
      startsAt: targetStart,
      endsAt: targetEnd,
      price: (patch.price as number | null | undefined) ?? reservation.price
    });
    if (confirmationError) return confirmationError;
  }

  const { data: updated, error: updateError } = await admin
    .from("reservations")
    .update(patch)
    .eq("id", params.id)
    .select("id")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: body.status && body.status !== reservation.status ? "status_change" : "update",
    tableName: "reservations",
    recordId: updated.id,
    previousData: reservation as unknown as Record<string, unknown>,
    newData: {
      ...patch,
      confirmed_without_barber: body.status === "confirmado" && !newEmployeeId
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({ ok: true });
}
