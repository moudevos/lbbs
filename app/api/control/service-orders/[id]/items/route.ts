import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

function money(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const { data: order, error: orderError } = await context.admin
    .from("service_orders")
    .select("id,status,branch_id,employee_id,subtotal,total,discount_amount,total_paid")
    .eq("id", params.id)
    .maybeSingle();

  if (orderError || !order) return NextResponse.json({ error: orderError?.message ?? "Atención no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && order.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Atención fuera de tu sede" }, { status: 403 });
  }
  if (order.status !== "registrado") return NextResponse.json({ error: "No se puede editar una atención pagada o anulada" }, { status: 400 });

  let itemPayload: Record<string, unknown> | null = null;
  let auditData: Record<string, unknown> = {};

  if (body.itemType === "manual_extra") {
    const amount = money(body.amount);
    if (!body.name || amount <= 0) return NextResponse.json({ error: "Nombre y monto mayor a 0 requeridos" }, { status: 400 });
    itemPayload = {
      service_order_id: params.id,
      item_type: "manual_extra",
      name: body.name,
      description: body.name,
      quantity: 1,
      unit_price: amount,
      amount,
      subtotal: amount,
      barber_id: order.employee_id,
      branch_id: order.branch_id
    };
    auditData = { item_type: "manual_extra", name: body.name, amount };
  }

  if (body.itemType === "product") {
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    if (!body.productId || quantity <= 0) return NextResponse.json({ error: "Producto y cantidad requeridos" }, { status: 400 });
    const { data: product, error: productError } = await context.admin
      .from("products")
      .select("id,name,sale_price,branch_id,is_active,counts_for_seller_credit,seller_credit_amount")
      .eq("id", body.productId)
      .maybeSingle();
    if (productError || !product || !product.is_active) return NextResponse.json({ error: productError?.message ?? "Producto no encontrado" }, { status: 404 });
    if (product.branch_id && product.branch_id !== order.branch_id) return NextResponse.json({ error: "Producto fuera de sede" }, { status: 400 });
    const { data: branchStock } = await context.admin
      .from("product_branch_stock")
      .select("stock_current")
      .eq("product_id", body.productId)
      .eq("branch_id", order.branch_id)
      .maybeSingle();
    const previousStock = Number(branchStock?.stock_current ?? 0);
    if (previousStock < quantity) return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });

    const unitPrice = money(body.unitPrice ?? product.sale_price);
    const subtotal = money(unitPrice * quantity);
    const soldByEmployeeId = body.sellerType === "reception"
      ? context.employee.employeeId
      : body.soldByEmployeeId || null;

    if (!soldByEmployeeId) return NextResponse.json({ error: "Selecciona quien vendio el producto" }, { status: 400 });

    const { data: seller, error: sellerError } = await context.admin
      .from("employees")
      .select("id,role,branch_id,is_active")
      .eq("id", soldByEmployeeId)
      .maybeSingle();

    if (sellerError || !seller || !seller.is_active) {
      return NextResponse.json({ error: sellerError?.message ?? "Vendedor no encontrado o inactivo" }, { status: 400 });
    }
    if (seller.role === "barbero" && seller.branch_id !== order.branch_id) {
      return NextResponse.json({ error: "El vendedor no pertenece a la sede de la atencion" }, { status: 400 });
    }

    itemPayload = {
      service_order_id: params.id,
      item_type: "product",
      product_id: product.id,
      name: product.name,
      description: product.name,
      quantity,
      unit_price: unitPrice,
      amount: subtotal,
      subtotal,
      branch_id: order.branch_id,
      sold_by_employee_id: soldByEmployeeId,
      counts_for_seller_credit: Boolean(product.counts_for_seller_credit),
      seller_credit_amount: product.counts_for_seller_credit ? money(product.seller_credit_amount ?? 2) : 0
    };

    const newStock = previousStock - quantity;
    await context.admin
      .from("product_branch_stock")
      .update({ stock_current: newStock, updated_at: new Date().toISOString() })
      .eq("product_id", product.id)
      .eq("branch_id", order.branch_id);
    await context.admin.from("product_stock_movements").insert({
      product_id: product.id,
      branch_id: order.branch_id,
      service_order_id: params.id,
      movement_type: "sale",
      movement_kind: "venta",
      quantity,
      quantity_delta: -quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: "Producto agregado a atención",
      created_by: context.employee.userId,
      actor_user_id: context.employee.userId
    });
    auditData = {
      item_type: "product",
      product_id: product.id,
      quantity,
      sold_by_employee_id: soldByEmployeeId,
      counts_for_seller_credit: Boolean(product.counts_for_seller_credit),
      seller_credit_amount: product.counts_for_seller_credit ? money(product.seller_credit_amount ?? 2) : 0,
      previous_stock: previousStock,
      new_stock: newStock
    };
  }

  if (!itemPayload) return NextResponse.json({ error: "Tipo de item no soportado" }, { status: 400 });

  const { data: item, error } = await context.admin.from("service_order_items").insert(itemPayload).select("id,subtotal").single();
  if (error || !item) return NextResponse.json({ error: error?.message ?? "No se pudo agregar item" }, { status: 500 });

  const nextSubtotal = money(order.subtotal) + money(item.subtotal);
  const nextTotal = Math.max(money(nextSubtotal) - money(order.discount_amount), 0);
  const nextBalance = Math.max(nextTotal - money(order.total_paid), 0);
  await context.admin.from("service_orders").update({ subtotal: nextSubtotal, total: nextTotal, balance: nextBalance }).eq("id", params.id);

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_order_items",
    recordId: item.id,
    newData: auditData
  });

  return NextResponse.json({ itemId: item.id, subtotal: nextSubtotal, total: nextTotal, balance: nextBalance });
}
