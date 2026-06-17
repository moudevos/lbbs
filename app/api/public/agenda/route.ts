import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateRangeForDay } from "@/lib/reservations/time";

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
  const branchId = request.nextUrl.searchParams.get("branch_id");
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!branchId) return NextResponse.json({ error: "branch_id requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id,name")
    .eq("id", branchId)
    .eq("is_active", true)
    .maybeSingle();
  if (branchError || !branch) return NextResponse.json({ error: branchError?.message ?? "Sede no encontrada" }, { status: 404 });

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const { data: schedule } = await admin
    .from("branch_schedules")
    .select("opens_at,closes_at")
    .eq("branch_id", branchId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .maybeSingle();

  const open = schedule?.opens_at?.slice(0, 5) ?? DEFAULT_OPEN;
  const close = schedule?.closes_at?.slice(0, 5) ?? DEFAULT_CLOSE;
  const range = dateRangeForDay(date);
  const { data: reservations, error } = await admin
    .from("reservations")
    .select("starts_at,ends_at,status")
    .eq("branch_id", branchId)
    .in("status", ["confirmado", "atendido"])
    .gte("starts_at", range.from)
    .lte("starts_at", range.to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const blocks = [];
  for (let cursor = timeToMinutes(open); cursor < timeToMinutes(close); cursor += 30) {
    const time = minutesToTime(cursor);
    const occupied = (reservations ?? []).some((reservation) => {
      const start = new Date(reservation.starts_at);
      const end = new Date(reservation.ends_at);
      const block = new Date(`${date}T${time}:00`);
      return block >= start && block < end;
    });
    blocks.push({ time, status: occupied ? "ocupado" : "disponible" });
  }

  return NextResponse.json({ branch, date, open, close, blocks });
}
