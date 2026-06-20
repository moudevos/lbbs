import { NextResponse, type NextRequest } from "next/server";
import { authenticateLocalDevice } from "@/lib/local/authenticate-local-device";
import { sendWebPushToBranch } from "@/lib/notifications/send-web-push";

export async function POST(request: NextRequest) {
  const context = await authenticateLocalDevice(request);
  if ("error" in context) return context.error;
  const branchId = context.device.branch_id;
  const { data, error } = await context.admin.rpc("create_operational_notification", {
    p_branch_id: branchId,
    p_type: "device.test",
    p_title: "Prueba de dispositivo",
    p_body: "El dispositivo local recibe eventos operativos.",
    p_target_type: "device",
    p_target_id: context.device.id,
    p_url: "/local/agenda",
    p_payload: { device_id: context.device.id }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const push = await sendWebPushToBranch(context.admin, branchId, {
    title: "Prueba de dispositivo",
    body: "Notificaciones locales activas.",
    url: "/local/agenda",
    notificationId: data,
    type: "device.test",
    branchId
  });
  return NextResponse.json({ ok: true, notificationId: data, push });
}
