import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const allowed = ["pending", "approved", "rejected", "hidden"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const status = String(body.status ?? "");
  if (!allowed.includes(status)) return NextResponse.json({ error: "Estado invalido" }, { status: 400 });

  const { data: previous } = await context.admin.from("customer_reviews").select("*").eq("id", params.id).maybeSingle();
  if (context.employee.role === "recepcion" && previous?.branch_id && previous.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Resena fuera de tu sede" }, { status: 403 });
  }

  const patch = {
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    approved_by: status === "approved" ? context.employee.userId : null
  };
  const { error } = await context.admin.from("customer_reviews").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "status_change",
    tableName: "customer_reviews",
    recordId: params.id,
    previousData: previous,
    newData: patch
  });

  return NextResponse.json({ ok: true });
}
