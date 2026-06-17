import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { syncRewardAccount } from "@/lib/rewards/server";

function money(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export async function DELETE(_request: Request, { params }: { params: { id: string; itemId: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { data: order, error: orderError } = await context.admin
    .from("service_orders")
    .select("id,status,branch_id,subtotal,total_paid,discount_amount,customer_id,reward_redemption_id")
    .eq("id", params.id)
    .maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message ?? "Atención no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && order.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Atención fuera de tu sede" }, { status: 403 });
  }
  if (!["registrado", "pendiente_pago"].includes(order.status)) return NextResponse.json({ error: "No se puede editar una atención pagada o anulada" }, { status: 400 });

  const { data: item, error: itemError } = await context.admin
    .from("service_order_items")
    .select("id,item_type,product_id,quantity,subtotal,discount_amount")
    .eq("id", params.itemId)
    .eq("service_order_id", params.id)
    .maybeSingle();
  if (itemError || !item) return NextResponse.json({ error: itemError?.message ?? "Item no encontrado" }, { status: 404 });

  if (item.item_type === "product" && item.product_id) {
    const { data: branchStock } = await context.admin
      .from("product_branch_stock")
      .select("stock_current")
      .eq("product_id", item.product_id)
      .eq("branch_id", order.branch_id)
      .maybeSingle();
    const previousStock = Number(branchStock?.stock_current ?? 0);
    const quantity = Math.trunc(Number(item.quantity ?? 0));
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
      reason: "Item eliminado antes de pago",
      created_by: context.employee.userId,
      actor_user_id: context.employee.userId
    });
  }

  const { error } = await context.admin.from("service_order_items").delete().eq("id", params.itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let nextSubtotal = Math.max(money(order.subtotal) - money(item.subtotal), 0);
  let nextDiscount = money(order.discount_amount);
  let clearRewardRedemption = false;
  if (item.item_type === "reward_discount") {
    nextSubtotal = money(order.subtotal);
    nextDiscount = Math.max(nextDiscount - money(item.discount_amount ?? Math.abs(Number(item.subtotal ?? 0))), 0);
    clearRewardRedemption = true;
    if (order.reward_redemption_id) {
      await context.admin
        .from("customer_reward_redemptions")
        .update({ status: "cancelled" })
        .eq("id", order.reward_redemption_id)
        .eq("service_order_id", params.id);
      await context.admin.from("customer_reward_ledger").insert({
        customer_id: order.customer_id,
        event_type: "reward_cancelled",
        service_order_id: params.id,
        branch_id: order.branch_id,
        points_delta: 0,
        reward_delta: 1,
        description: "Reward liberado antes del pago"
      });
      const { data: account } = await context.admin
        .from("customer_reward_accounts")
        .select("redeemed_rewards")
        .eq("customer_id", order.customer_id)
        .maybeSingle();
      await context.admin
        .from("customer_reward_accounts")
        .update({ redeemed_rewards: Math.max(Number(account?.redeemed_rewards ?? 0) - 1, 0), updated_at: new Date().toISOString() })
        .eq("customer_id", order.customer_id);
      await syncRewardAccount(context.admin, order.customer_id);
    }
  }
  const nextTotal = Math.max(nextSubtotal - nextDiscount, 0);
  const nextBalance = Math.max(nextTotal - money(order.total_paid), 0);
  await context.admin
    .from("service_orders")
    .update({ subtotal: nextSubtotal, total: nextTotal, balance: nextBalance, discount_amount: nextDiscount, reward_redemption_id: clearRewardRedemption ? null : order.reward_redemption_id })
    .eq("id", params.id);

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_order_items",
    recordId: params.itemId,
    previousData: item as Record<string, unknown>,
    newData: { deleted: true, reward_released: clearRewardRedemption }
  });

  return NextResponse.json({ ok: true, subtotal: nextSubtotal, total: nextTotal, balance: nextBalance });
}
