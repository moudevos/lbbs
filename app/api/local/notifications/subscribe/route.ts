import { NextResponse, type NextRequest } from "next/server";
import { authenticateLocalDevice } from "@/lib/local/authenticate-local-device";

export async function POST(request: NextRequest) {
  const context = await authenticateLocalDevice(request);
  if ("error" in context) return context.error;
  const body = await request.json();
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Suscripcion push incompleta" }, { status: 400 });
  const { error } = await context.admin.from("push_subscriptions").upsert({
    device_id: context.device.id,
    branch_id: context.device.branch_id,
    endpoint,
    p256dh,
    auth,
    user_agent: request.headers.get("user-agent"),
    client_type: "local_device",
    active: true,
    last_seen_at: new Date().toISOString()
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, branchId: context.device.branch_id });
}
