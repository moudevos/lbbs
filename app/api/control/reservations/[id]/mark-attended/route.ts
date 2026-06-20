import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { convertReservationToServiceOrder } from "@/lib/service-orders/server";
import { dateRangeForDay, overlaps } from "@/lib/reservations/time";
import type { ReservationStatus } from "@/lib/reservations/types";

type MarkAttendedBody = {
  barberId?: string | null;
};

type ReservationForAttend = {
  id: string;
  branch_id: string;
  employee_id: string | null;
  service_id: string | null;
  status: ReservationStatus;
  price: number | null;
  starts_at: string;
  ends_at: string;
  services?: { sku: string | null; name: string | null } | { sku: string | null; name: string | null }[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getCurrentEmployee();
  if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (actor.role === "barbero") return NextResponse.json({ error: "Barbero no puede cerrar reservas" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as MarkAttendedBody;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reservations")
    .select("id,branch_id,employee_id,service_id,status,price,starts_at,ends_at,services(sku,name)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });

  const reservation = data as unknown as ReservationForAttend;
  if (actor.role === "recepcion" && reservation.branch_id !== actor.branchId) {
    return NextResponse.json({ error: "Reserva fuera de tu sede" }, { status: 403 });
  }
  if (reservation.status === "cancelado" || reservation.status === "no_asistio") {
    return NextResponse.json({ error: "No se puede crear atencion desde una reserva terminal" }, { status: 400 });
  }
  if (reservation.status !== "confirmado" && reservation.status !== "atendido") {
    return NextResponse.json({ error: "Solo reservas confirmadas pueden cerrarse como atendidas" }, { status: 400 });
  }

  const assignedBarberId = reservation.employee_id || body.barberId || null;
  if (!assignedBarberId) {
    return NextResponse.json({ error: "Selecciona un barbero para confirmar la atencion", code: "BARBER_REQUIRED" }, { status: 400 });
  }

  const { data: barber, error: barberError } = await admin
    .from("employees")
    .select("id,branch_id,is_active,role")
    .eq("id", assignedBarberId)
    .maybeSingle();

  if (barberError || !barber) return NextResponse.json({ error: barberError?.message ?? "Barbero no encontrado" }, { status: 404 });
  if (barber.role !== "barbero" || !barber.is_active) {
    return NextResponse.json({ error: "Selecciona un barbero activo" }, { status: 400 });
  }
  if (barber.branch_id !== reservation.branch_id) {
    return NextResponse.json({ error: "El barbero no pertenece a la sede de la reserva" }, { status: 400 });
  }

  const range = dateRangeForDay(reservation.starts_at.slice(0, 10));
  const { data: busyReservations, error: busyError } = await admin
    .from("reservations")
    .select("id,starts_at,ends_at,status")
    .eq("employee_id", assignedBarberId)
    .gte("starts_at", range.from)
    .lte("starts_at", range.to)
    .in("status", ["confirmado", "atendido"])
    .neq("id", params.id);

  if (busyError) return NextResponse.json({ error: busyError.message }, { status: 500 });

  const startsAt = new Date(reservation.starts_at);
  const endsAt = new Date(reservation.ends_at);
  const blocked = (busyReservations ?? []).some((item) => overlaps(startsAt, endsAt, new Date(item.starts_at), new Date(item.ends_at)));
  if (blocked) {
    return NextResponse.json({ error: "El barbero ya tiene una reserva confirmada o atendida en ese horario" }, { status: 409 });
  }

  const assignedInThisStep = !reservation.employee_id;
  if (assignedInThisStep) {
    const { error: assignError } = await admin
      .from("reservations")
      .update({ employee_id: assignedBarberId })
      .eq("id", params.id);

    if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 });

    await writeAuditLog(admin, {
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorBranchId: actor.branchId,
      eventType: "update",
      tableName: "reservations",
      recordId: params.id,
      previousData: { employee_id: null },
      newData: { employee_id: assignedBarberId, assigned_during: "mark_attended" },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent")
    });
  }

  const converted = await convertReservationToServiceOrder(admin, params.id);
  if (converted.error || !converted.serviceOrderId) {
    return NextResponse.json({ error: converted.error ?? "No se pudo crear atencion" }, { status: 500 });
  }

  if (reservation.status !== "atendido") {
    const { error: updateError } = await admin
      .from("reservations")
      .update({ status: "atendido" })
      .eq("id", params.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: "status_change",
    tableName: "reservations",
    recordId: params.id,
    previousData: { status: reservation.status },
    newData: { status: "atendido", service_order_id: converted.serviceOrderId, employee_id: assignedBarberId },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: converted.existed ? "update" : "create",
    tableName: "service_orders",
    recordId: converted.serviceOrderId,
    newData: { reservation_id: params.id, reused: converted.existed ?? false, employee_id: assignedBarberId },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({
    ok: true,
    reservationId: params.id,
    serviceOrderId: converted.serviceOrderId,
    redirectTo: `/app/control/atenciones/${converted.serviceOrderId}`
  });
}
