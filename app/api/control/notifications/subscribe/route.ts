import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const body = await request.json();
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Suscripcion push incompleta" }, { status: 400 });
  const { data, error } = await context.admin.from("push_subscriptions").upsert({
    employee_id: context.employee.employeeId,
    branch_id: context.employee.branchId,
    endpoint, p256dh, auth,
    user_agent: request.headers.get("user-agent"),
    client_type: "dashboard",
    active: true,
    last_seen_at: new Date().toISOString()
  }, { onConflict: "endpoint" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "create", tableName: "push_subscriptions", recordId: data.id,
    newData: { event: "push_subscription_created", endpoint_host: safeEndpointHost(endpoint) }
  });
  return NextResponse.json({ ok: true });
}

function safeEndpointHost(endpoint: string) {
  try { return new URL(endpoint).host; } catch { return "invalid"; }
}
