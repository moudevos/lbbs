import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { addMinutes, dateRangeForDay, overlaps, toLocalDateTime } from "@/lib/reservations/time";
import type { ReservationStatus } from "@/lib/reservations/types";

type ReservationRow = {
  id: string;
  branch_id: string;
  employee_id: string | null;
  service_id: string | null;
  status: ReservationStatus;
  starts_at: string;
  ends_at: string;
  price: number | null;
  observations: string | null;
  services?: { duration_minutes: number | null } | { duration_minutes: number | null }[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getCurrentEmployee();
  if (!actor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (actor.role === "barbero") return NextResponse.json({ error: "Barbero no puede reprogramar reservas" }, { status: 403 });

  const body = await request.json();
  if (!body.date || !body.startTime || !body.reason) {
    return NextResponse.json({ error: "Fecha, hora y motivo son requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reservations")
    .select("id,branch_id,employee_id,service_id,status,starts_at,ends_at,price,observations,services(duration_minutes)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });
  const reservation = data as unknown as ReservationRow;

  if (actor.role === "recepcion" && reservation.branch_id !== actor.branchId) {
    return NextResponse.json({ error: "Reserva fuera de tu sede" }, { status: 403 });
  }
  if (reservation.status === "cancelado" || reservation.status === "no_asistio" || reservation.status === "atendido") {
    return NextResponse.json({ error: "No se puede reprogramar una reserva terminal" }, { status: 400 });
  }

  const branchId = actor.role === "admin" ? body.branchId || reservation.branch_id : actor.branchId || reservation.branch_id;
  const employeeId = body.barberId === "" ? null : body.barberId ?? reservation.employee_id;
  const service = first(reservation.services);
  const duration = Number(service?.duration_minutes ?? 60);
  const startsAt = toLocalDateTime(body.date, body.startTime);
  const endsAt = addMinutes(startsAt, duration);

  let overlapWarning = false;

  if (employeeId) {
    const range = dateRangeForDay(body.date);
    let query = admin
      .from("reservations")
      .select("id,starts_at,ends_at,status")
      .eq("employee_id", employeeId)
      .gte("starts_at", range.from)
      .lte("starts_at", range.to)
      .neq("id", params.id);

    if (reservation.status === "confirmado") {
      query = query.eq("status", "confirmado");
    } else {
      query = query.in("status", ["pendiente", "contactado", "confirmado"]);
    }

    const { data: existing, error: existingError } = await query;
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    const blocked = (existing ?? []).some((item) => overlaps(startsAt, endsAt, new Date(item.starts_at), new Date(item.ends_at)));

    if (blocked && reservation.status === "confirmado") {
      return NextResponse.json({ error: "No se puede reprogramar: existe solapamiento confirmado para el barbero" }, { status: 409 });
    }
    overlapWarning = blocked;
  }

  const previousData = {
    branch_id: reservation.branch_id,
    employee_id: reservation.employee_id,
    starts_at: reservation.starts_at,
    ends_at: reservation.ends_at
  };
  const reasonLine = `[Reprogramacion: ${body.reason}]`;
  const patch = {
    branch_id: branchId,
    employee_id: employeeId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    observations: reservation.observations ? `${reservation.observations}\n${reasonLine}` : reasonLine
  };

  const { data: updated, error: updateError } = await admin
    .from("reservations")
    .update(patch)
    .eq("id", params.id)
    .select("id,status,starts_at,ends_at,branch_id,employee_id")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: "update",
    tableName: "reservations",
    recordId: params.id,
    previousData,
    newData: {
      branch_id: branchId,
      employee_id: employeeId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: body.reason
    },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({ ok: true, reservation: updated, overlapWarning });
}
