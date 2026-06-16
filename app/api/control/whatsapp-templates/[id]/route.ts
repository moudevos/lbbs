import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const allowedVariables = ["{cliente}", "{sede}", "{fecha}", "{hora}", "{barbero}", "{servicio}", "{precio}", "{telefono_sede}"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  const body = await request.json();
  if (!body.body) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  const unknownVariables = [...body.body.matchAll(/\{[^}]+\}/g)]
    .map((match: RegExpMatchArray) => match[0])
    .filter((variable: string) => !allowedVariables.includes(variable));
  if (unknownVariables.length > 0) {
    return NextResponse.json({ error: `Variables no permitidas: ${unknownVariables.join(", ")}` }, { status: 400 });
  }
  const patch = { body: body.body, is_active: body.isActive ?? true };
  const { error } = await context.admin.from("whatsapp_templates").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "whatsapp_templates",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
