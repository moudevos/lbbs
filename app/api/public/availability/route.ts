import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMinutes, dateRangeForDay, overlaps, toLocalDateTime } from "@/lib/reservations/time";

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "18:00";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");
  const serviceId = searchParams.get("serviceId");
  const employeeId = searchParams.get("employeeId");
  const date = searchParams.get("date");

  if (!branchId || !serviceId || !date) {
    return NextResponse.json({ error: "branchId, serviceId y date son requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: service, error: serviceError } = await admin
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: serviceError?.message ?? "Servicio no encontrado" }, { status: 404 });
  }

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  let open = DEFAULT_OPEN;
  let close = DEFAULT_CLOSE;

  const schedule = await admin
    .from("branch_schedules")
    .select("opens_at,closes_at,is_active")
    .eq("branch_id", branchId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (!schedule.error && schedule.data) {
    if (!schedule.data.is_active) {
      return NextResponse.json({ slots: [], open: null, close: null, durationMinutes: service.duration_minutes || 60, closed: true });
    }
    open = schedule.data.opens_at.slice(0, 5);
    close = schedule.data.closes_at.slice(0, 5);
  }

  if (employeeId) {
    const employeeSchedule = await admin
      .from("employee_schedules")
      .select("starts_at,ends_at")
      .eq("employee_id", employeeId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    if (!employeeSchedule.error && employeeSchedule.data) {
      open = employeeSchedule.data.starts_at.slice(0, 5);
      close = employeeSchedule.data.ends_at.slice(0, 5);
    }
  }

  const range = dateRangeForDay(date);
  const reservations = employeeId
    ? await admin
        .from("reservations")
        .select("starts_at,ends_at")
        .eq("employee_id", employeeId)
        .in("status", ["confirmado", "atendido"])
        .gte("starts_at", range.from)
        .lte("starts_at", range.to)
    : { data: [], error: null };

  if (reservations.error) {
    return NextResponse.json({ error: reservations.error.message }, { status: 500 });
  }

  const duration = service.duration_minutes || 60;
  const busy = (reservations.data ?? []).map((reservation) => ({
    start: new Date(reservation.starts_at),
    end: new Date(reservation.ends_at)
  }));
  const slots: string[] = [];

  const latestStart = Math.min(timeToMinutes(close) - 60, timeToMinutes(close) - duration);

  for (let cursor = timeToMinutes(open); cursor <= latestStart; cursor += 15) {
    const start = toLocalDateTime(date, minutesToTime(cursor));
    const end = addMinutes(start, duration);
    const blocked = busy.some((block) => overlaps(start, end, block.start, block.end));
    if (!blocked) slots.push(minutesToTime(cursor));
  }

  return NextResponse.json({ slots, open, close, durationMinutes: duration });
}
