import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const body = await request.json().catch(() => ({}));
  const branchId = context.employee.role === "admin" ? body.branchId : context.employee.branchId;
  if (!branchId) return NextResponse.json({ error: "Selecciona una sede para probar el recordatorio" }, { status: 400 });

  const { data, error } = await context.admin.rpc("create_operational_notification", {
    p_branch_id: branchId,
    p_type: "reservation.reminder",
    p_title: "Recordatorio de prueba",
    p_body: "El procesamiento de recordatorios y Broadcast funciona correctamente.",
    p_target_type: "system",
    p_target_id: null,
    p_url: "/app/control/agenda",
    p_payload: {
      test: true,
      timezone: "America/Lima",
      sent_by: context.employee.employeeId
    }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notificationId: data });
}
