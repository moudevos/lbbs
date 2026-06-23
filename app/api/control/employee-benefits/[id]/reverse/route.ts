import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { adjustBenefitStock } from "@/lib/employee-benefits/server";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin(); if (!context.ok) return context.error;
  const reason = String((await request.json()).reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "Motivo de reversion requerido" }, { status: 400 });
  const { data: movement, error } = await context.admin.from("employee_benefit_movements").select("*").eq("id", params.id).maybeSingle();
  if (error || !movement) return NextResponse.json({ error: error?.message ?? "Movimiento no encontrado" }, { status: 404 });
  if (movement.status === "liquidated") return NextResponse.json({ error: "Un movimiento liquidado requiere un ajuste nuevo" }, { status: 409 });
  if (movement.status !== "active") return NextResponse.json({ error: "El movimiento ya no esta activo" }, { status: 409 });
  let returnMovementId: string | null = null;
  if (movement.stock_movement_id && movement.product_id && movement.branch_id) {
    const stock = await adjustBenefitStock({
      admin: context.admin, productId: movement.product_id, branchId: movement.branch_id,
      quantity: Number(movement.quantity), direction: "in", actor: context.employee,
      reason: `Reversion beneficio ${movement.id}: ${reason}`
    });
    if (stock.error) return NextResponse.json({ error: stock.error }, { status: 500 });
    returnMovementId = stock.movementId ?? null;
  }
  const { error: updateError } = await context.admin.from("employee_benefit_movements").update({
    status: "reversed", reversed_at: new Date().toISOString(), reversed_by: context.employee.employeeId,
    reversal_reason: reason, metadata: { ...(movement.metadata ?? {}), reversal_stock_movement_id: returnMovementId }
  }).eq("id", params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "status_change", tableName: "employee_benefit_movements", recordId: params.id,
    previousData: movement, newData: { status: "reversed", reason, returnMovementId }
  });
  return NextResponse.json({ ok: true });
}
