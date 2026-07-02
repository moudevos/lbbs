import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/control/api";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const reason = String(body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "Motivo requerido" }, { status: 400 });

  const { data: movement, error } = await context.admin
    .from("cash_operational_movements")
    .select("id,branch_id,status,amount,payment_method,description,related_product_id,related_stock_movement_id,metadata")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!movement) return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  if (movement.status !== "active") return NextResponse.json({ error: "El movimiento ya fue anulado" }, { status: 409 });
  if (!movement.related_product_id) return NextResponse.json({ error: "Movimiento sin producto relacionado" }, { status: 400 });

  const quantity = Math.trunc(Number(movement.metadata?.quantity ?? 0));
  if (quantity <= 0) return NextResponse.json({ error: "Movimiento sin cantidad valida" }, { status: 400 });

  const { data: stock } = await context.admin
    .from("product_branch_stock")
    .select("id,stock_current,stock_minimum")
    .eq("product_id", movement.related_product_id)
    .eq("branch_id", movement.branch_id)
    .maybeSingle();
  const previousStock = Number(stock?.stock_current ?? 0);
  if (previousStock < quantity) return NextResponse.json({ error: "No hay stock suficiente para revertir esta reposicion" }, { status: 409 });
  const newStock = previousStock - quantity;

  const { error: stockError } = await context.admin.from("product_branch_stock").upsert(
    {
      product_id: movement.related_product_id,
      branch_id: movement.branch_id,
      stock_current: newStock,
      stock_minimum: Number(stock?.stock_minimum ?? 0),
      updated_at: new Date().toISOString()
    },
    { onConflict: "product_id,branch_id" }
  );
  if (stockError) return NextResponse.json({ error: stockError.message }, { status: 500 });

  const stockPayload = {
    product_id: movement.related_product_id,
    branch_id: movement.branch_id,
    movement_type: "void",
    movement_kind: "anulacion_reposicion_caja",
    quantity,
    quantity_delta: -quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    reason: `Anulacion de reposicion con caja: ${reason}`,
    reference: `cash_operational_void:${movement.id}`,
    created_by: context.employee.userId,
    actor_user_id: context.employee.userId,
    metadata: {
      ...(movement.metadata ?? {}),
      cash_operational_movement_id: movement.id,
      void_reason: reason,
      voided_at: new Date().toISOString()
    }
  };
  const { data: stockMovement, error: movementError } = await context.admin
    .from("product_stock_movements")
    .insert(stockPayload)
    .select("id")
    .single();
  if (movementError || !stockMovement) {
    await context.admin.from("product_branch_stock").upsert(
      {
        product_id: movement.related_product_id,
        branch_id: movement.branch_id,
        stock_current: previousStock,
        stock_minimum: Number(stock?.stock_minimum ?? 0),
        updated_at: new Date().toISOString()
      },
      { onConflict: "product_id,branch_id" }
    );
    return NextResponse.json({ error: movementError?.message ?? "No se pudo registrar kardex inverso" }, { status: 500 });
  }

  const nextMetadata = {
    ...(movement.metadata ?? {}),
    reversal_stock_movement_id: stockMovement.id,
    void_reason: reason
  };
  const { error: updateError } = await context.admin
    .from("cash_operational_movements")
    .update({
      status: "voided",
      voided_by: context.employee.userId,
      voided_at: new Date().toISOString(),
      void_reason: reason,
      metadata: nextMetadata
    })
    .eq("id", movement.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "status_change",
    tableName: "cash_operational_movements",
    recordId: movement.id,
    previousData: { status: movement.status, stock: previousStock },
    newData: { event: "stock_replenishment_cash_voided", status: "voided", reason, stock: newStock }
  });

  return NextResponse.json({ ok: true, reversalStockMovementId: stockMovement.id, stockCurrent: newStock });
}
