import { NextResponse, type NextRequest } from "next/server";
import type { AppRole } from "@/lib/auth/types";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const role = body.role as AppRole;
  if (!body.firstName || !body.lastName || !role) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  if ((role === "recepcion" || role === "barbero") && !body.branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
  const patch = {
    branch_id: body.branchId || null,
    role,
    first_name: body.firstName,
    last_name: body.lastName,
    phone: body.phone ?? null,
    email: body.email ?? null,
    is_active: body.isActive ?? true
  };
  const { error } = await context.admin.from("employees").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "employees",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
