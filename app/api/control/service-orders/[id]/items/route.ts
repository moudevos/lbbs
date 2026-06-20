import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { resolveCustomerProductDiscount } from "@/lib/customers/customer-product-discount";

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
    .select("id,status,branch_id,employee_id,customer_id,subtotal,total,discount_amount,total_paid,customers(phone)")
    .eq("id", params.id)
    .maybeSingle();

  if (orderError || !order) return NextResponse.json({ error: orderError?.message ?? "Atención no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && order.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Atención fuera de tu sede" }, { status: 403 });
  }
  if (!["registrado", "pendiente_pago"].includes(order.status)) return NextResponse.json({ error: "No se puede editar una atención pagada o anulada" }, { status: 400 });

  let itemPayload: Record<string, unknown> | null = null;
  let auditData: Record<string, unknown> = {};

  if (body.itemType === "service") {
    if (!body.serviceId) return NextResponse.json({ error: "Servicio requerido" }, { status: 400 });
    const { data: service, error: serviceError } = await context.admin
      .from("services")
      .select("id,name,price,branch_id,is_active,allow_manual_price,is_custom_service")
      .eq("id", body.serviceId)
      .maybeSingle();
    if (serviceError || !service || !service.is_active) return NextResponse.json({ error: serviceError?.message ?? "Servicio no encontrado" }, { status: 404 });
    if (service.branch_id && service.branch_id !== order.branch_id) return NextResponse.json({ error: "Servicio fuera de sede" }, { status: 400 });
    const amount = money(body.amount ?? service.price);
    if (amount < 0 || (service.allow_manual_price && amount <= 0)) return NextResponse.json({ error: "Precio manual mayor a 0 requerido" }, { status: 400 });
    if (service.allow_manual_price && !String(body.description ?? "").trim()) return NextResponse.json({ error: "Descripcion requerida para Personalizado" }, { status: 400 });
    itemPayload = {
      service_order_id: params.id,
      item_type: service.is_custom_service ? "custom_service" : "service",
      service_id: service.id,
      name: service.name,
      description: service.allow_manual_price ? String(body.description).trim() : service.name,
      quantity: 1,
      unit_price: amount,
      amount,
      subtotal: amount,
      barber_id: order.employee_id,
      branch_id: order.branch_id
    };
    auditData = { item_type: "service", service_id: service.id, amount };
  }

  if (body.itemType === "courtesy") {
    const courtesyType = String(body.courtesyType ?? "").trim();
    if (!courtesyType) return NextResponse.json({ error: "Cortesia requerida" }, { status: 400 });
    itemPayload = {
      service_order_id: params.id,
      item_type: "courtesy",
      name: courtesyType,
      description: `Cortesia: ${courtesyType}`,
      quantity: 1,
      unit_price: 0,
      amount: 0,
      subtotal: 0,
      branch_id: order.branch_id,
      courtesy_type: courtesyType,
      stock_controlled: false
    };
    auditData = { item_type: "courtesy", courtesy_type: courtesyType, amount: 0 };
  }

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
      .select("id,name,sale_price,branch_id,is_active,category,counts_for_seller_credit,seller_credit_amount")
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

    const originalUnitPrice = money(body.unitPrice ?? product.sale_price);
    const discount = await resolveCustomerProductDiscount(context.admin, order.customer_id, product.category);
    const discountAmount = discount.eligible ? money(originalUnitPrice * quantity * discount.percent / 100) : 0;
    const unitPrice = discount.eligible ? money(originalUnitPrice * (1 - discount.percent / 100)) : originalUnitPrice;
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
      original_unit_price: originalUnitPrice,
      discount_percent: discount.eligible ? discount.percent : 0,
      discount_amount: discountAmount,
      discount_rule: discount.eligible ? "customer_recurrent_barber_product" : null,
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
      ,
      customer_id: order.customer_id,
      valid_visits: discount.validVisits,
      original_price: originalUnitPrice,
      discount_percent: discount.eligible ? discount.percent : 0,
      discount_amount: discountAmount,
      final_price: unitPrice,
      discount_rule: discount.eligible ? "customer_recurrent_barber_product" : null
    };
  }

  if (!itemPayload) return NextResponse.json({ error: "Tipo de item no soportado" }, { status: 400 });
  itemPayload = {
    ...itemPayload,
    discount_amount: money(itemPayload.discount_amount),
    seller_credit_amount: money(itemPayload.seller_credit_amount),
    counts_for_seller_credit: Boolean(itemPayload.counts_for_seller_credit),
    stock_controlled: Boolean(itemPayload.stock_controlled)
  };

  const { data: item, error } = await context.admin.from("service_order_items").insert(itemPayload).select("id,subtotal,quantity,original_unit_price,discount_amount").single();
  if (error || !item) return NextResponse.json({ error: error?.message ?? "No se pudo agregar item" }, { status: 500 });

  const itemGross = item.original_unit_price == null ? money(item.subtotal) : money(item.original_unit_price) * Number(item.quantity ?? 1);
  const nextSubtotal = money(order.subtotal) + money(itemGross);
  const nextDiscount = money(order.discount_amount) + money(item.discount_amount);
  const nextTotal = Math.max(money(nextSubtotal) - nextDiscount, 0);
  const nextBalance = Math.max(nextTotal - money(order.total_paid), 0);
  await context.admin.from("service_orders").update({ subtotal: nextSubtotal, discount_amount: nextDiscount, total: nextTotal, balance: nextBalance }).eq("id", params.id);

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_order_items",
    recordId: item.id,
    newData: auditData
  });

  return NextResponse.json({ itemId: item.id, subtotal: nextSubtotal, total: nextTotal, balance: nextBalance, discount: auditData.discount_amount ? auditData : null });
}
