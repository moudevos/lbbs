import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { sendWebPushToBranch } from "@/lib/notifications/send-web-push";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const body = await request.json().catch(() => ({}));
  const branchId = context.employee.role === "admin" ? body.branchId : context.employee.branchId;
  if (!branchId) return NextResponse.json({ error: "Selecciona una sede antes de enviar la prueba" }, { status: 400 });
  const { data, error } = await context.admin.rpc("create_operational_notification", {
    p_branch_id: branchId,
    p_type: "system.test",
    p_title: "Evento Realtime de prueba",
    p_body: "Broadcast operativo recibido correctamente.",
    p_target_type: "system",
    p_target_id: null,
    p_url: "/app/control/configuracion",
    p_payload: { sent_by: context.employee.employeeId }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const push = await sendWebPushToBranch(context.admin, branchId, {
    title: "Evento de prueba",
    body: "Realtime y Web Push operativos.",
    url: "/app/control/configuracion",
    notificationId: data,
    type: "system.test",
    branchId
  });
  return NextResponse.json({ ok: true, notificationId: data, push });
}
