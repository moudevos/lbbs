import type { SupabaseClient } from "@supabase/supabase-js";
import { peruDayOfWeek } from "@/lib/datetime/peru-time";

type AdminClient = SupabaseClient<any, "public", any>;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export async function validateOperationalSchedule({
  admin,
  branchId,
  employeeId,
  date,
  time,
  durationMinutes
}: {
  admin: AdminClient;
  branchId: string;
  employeeId?: string | null;
  date: string;
  time: string;
  durationMinutes: number;
}) {
  const dayOfWeek = peruDayOfWeek(date);
  const { data: branchSchedule, error } = await admin
    .from("branch_schedules")
    .select("opens_at,closes_at,is_active")
    .eq("branch_id", branchId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();
  if (error) return error.message;
  if (branchSchedule && !branchSchedule.is_active) return "La sede no atiende en la fecha seleccionada";

  let open = branchSchedule?.opens_at?.slice(0, 5) ?? "09:00";
  let close = branchSchedule?.closes_at?.slice(0, 5) ?? "18:00";
  if (employeeId) {
    const { data: employeeSchedule, error: employeeError } = await admin
      .from("employee_schedules")
      .select("starts_at,ends_at,is_active")
      .eq("employee_id", employeeId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();
    if (employeeError) return employeeError.message;
    if (employeeSchedule && !employeeSchedule.is_active) return "El barbero no atiende en la fecha seleccionada";
    if (employeeSchedule) {
      open = employeeSchedule.starts_at.slice(0, 5);
      close = employeeSchedule.ends_at.slice(0, 5);
    }
  }

  const start = timeToMinutes(time);
  const closeMinutes = timeToMinutes(close);
  if (start < timeToMinutes(open)) return `El horario inicia a las ${open}`;
  if (start > closeMinutes - 30) return `La ultima reserva debe iniciar como maximo 30 minutos antes del cierre (${close})`;
  if (start + durationMinutes > closeMinutes) return "La duracion del servicio supera el horario operativo";
  return null;
}
