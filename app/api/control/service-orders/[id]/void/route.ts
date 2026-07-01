import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { voidProductionForOrder } from "@/lib/production/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { data: order } = await context.admin
    .from("service_orders")
    .select("id,branch_id,status,order_type,service_order_items(id,item_type,product_id,quantity)")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Atención no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && order.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Atención fuera de tu sede" }, { status: 403 });
  }
  if (order.order_type === "product_sale" && !String(body.reason ?? "").trim()) {
    return NextResponse.json({ error: "Motivo obligatorio para anular venta de productos" }, { status: 400 });
  }

  for (const item of (order.service_order_items ?? []) as any[]) {
    if (item.item_type !== "product" || !item.product_id) continue;
    const quantity = Math.trunc(Number(item.quantity ?? 0));
    const { data: branchStock } = await context.admin
      .from("product_branch_stock")
      .select("stock_current")
      .eq("product_id", item.product_id)
      .eq("branch_id", order.branch_id)
      .maybeSingle();
    const previousStock = Number(branchStock?.stock_current ?? 0);
    const newStock = previousStock + quantity;
    await context.admin
      .from("product_branch_stock")
      .update({ stock_current: newStock, updated_at: new Date().toISOString() })
      .eq("product_id", item.product_id)
      .eq("branch_id", order.branch_id);
    await context.admin.from("product_stock_movements").insert({
      product_id: item.product_id,
      branch_id: order.branch_id,
      service_order_id: params.id,
      movement_type: "void",
      movement_kind: "anulacion_venta",
      quantity,
      quantity_delta: quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: body.reason ?? "Atención anulada",
      created_by: context.employee.userId,
      actor_user_id: context.employee.userId
    });
  }

  const { error } = await context.admin
    .from("service_orders")
    .update({ status: "anulado", voided_at: new Date().toISOString(), void_reason: body.reason ?? null })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const production = await voidProductionForOrder(context.admin, params.id, context.employee.userId);
  if (production.error) return NextResponse.json({ error: production.error }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "delete",
    tableName: "service_orders",
    recordId: params.id,
    newData: { status: "anulado", reason: body.reason ?? null, production }
  });

  return NextResponse.json({ ok: true });
}
