import { createHash, randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { data, error } = await context.admin
    .from("local_devices")
    .select("id,device_name,device_code,branch_id,status,last_seen_at,created_at,revoked_at,branches(name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (!body.branchId || !body.name) return NextResponse.json({ error: "Sede y nombre requeridos" }, { status: 400 });
  const token = randomBytes(18).toString("base64url");
  const deviceCode = `LOCAL-${randomBytes(3).toString("hex").toUpperCase()}`;
  const { data, error } = await context.admin
    .from("local_devices")
    .insert({
      branch_id: body.branchId,
      device_name: body.name,
      device_code: deviceCode,
      access_token_hash: hash(token),
      created_by: context.employee.userId
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "local_devices",
    recordId: data.id,
    newData: { branch_id: body.branchId, name: body.name, device_code: deviceCode }
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.json({ deviceId: data.id, deviceCode, link: `${appUrl}/local/login?token=${token}` });
}
