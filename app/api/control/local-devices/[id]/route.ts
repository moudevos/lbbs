import { createHash, randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "revoke") {
    const patch = { status: "revoked", revoked_at: new Date().toISOString() };
    const { error } = await context.admin.from("local_devices").update(patch).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "update", tableName: "local_devices", recordId: params.id, newData: { action } });
    return NextResponse.json({ ok: true });
  }

  if (action === "regenerate") {
    const token = randomBytes(18).toString("base64url");
    const patch = { access_token_hash: hash(token), status: "active", revoked_at: null };
    const { error } = await context.admin.from("local_devices").update(patch).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "update", tableName: "local_devices", recordId: params.id, newData: { action } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.json({ link: `${appUrl}/local/login?token=${token}` });
  }

  return NextResponse.json({ error: "Accion invalida" }, { status: 400 });
}
