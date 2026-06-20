import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCustomerByPhone } from "@/lib/reservations/server";
import { applyClassicCutReward, countServiceOrderVisitOnce, finalizeReward } from "@/lib/rewards/server";
import { calculateProductionForPaidOrder } from "@/lib/production/server";
import type { PaymentMethod, PaymentSplit } from "./types";
import { resolveCustomerProductDiscount } from "@/lib/customers/customer-product-discount";

type AdminClient = SupabaseClient<any, "public", any>;

export function normalizeMoney(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export function buildPaymentSplits(method: PaymentMethod, total: number, splits?: PaymentSplit[]) {
  if (method !== "mixto") {
    return [{ method, amount: total, reference: null }] as PaymentSplit[];
  }
  return (splits ?? []).map((split) => ({
    method: split.method,
    amount: normalizeMoney(split.amount),
    reference: split.reference ?? null
  }));
}

export function validatePaymentSplits(total: number, splits: PaymentSplit[]) {
  if (normalizeMoney(total) === 0) return null;
  if (splits.length === 0) return "Debe registrar al menos un pago";
  if (splits.some((split) => normalizeMoney(split.amount) <= 0)) {
    return "Cada pago debe tener metodo valido y monto mayor a 0";
  }
  const paid = normalizeMoney(splits.reduce((sum, split) => sum + normalizeMoney(split.amount), 0));
  return paid === normalizeMoney(total) ? null : "La suma de pagos debe coincidir exactamente con el total";
}

export const missingAttentionItemsMessage = "Agrega al menos un servicio o producto antes de guardar la atencion.";
export const missingPaymentItemsMessage = "Agrega al menos un servicio o producto antes de registrar el pago.";

export async function createServiceOrder({
  admin,
  branchId,
  customerPhone,
  customerName,
  employeeId,
  serviceId,
  total,
  additions,
  productItems,
  observations,
  reservationId,
  origin = reservationId ? "reservation" : "walk_in",
  discountAmount = 0,
  rewardRedemptionId = null,
  status = "registrado",
  serviceDate = null
}: {
  admin: AdminClient;
  branchId: string;
  customerPhone: string;
  customerName: string;
  employeeId: string;
  serviceId?: string | null;
  total: number;
  additions?: { name: string; amount: number }[];
  productItems?: { productId: string; quantity: number; unitPrice?: number; soldByEmployeeId?: string | null }[];
  observations?: string | null;
  reservationId?: string | null;
  origin?: "walk_in" | "reservation" | "local_device" | "local";
  discountAmount?: number;
  rewardRedemptionId?: string | null;
  status?: "registrado" | "pendiente_pago";
  serviceDate?: string | null;
}) {
  if (reservationId) {
    const { data: existing } = await admin
      .from("service_orders")
      .select("id")
      .eq("reservation_id", reservationId)
      .maybeSingle();
    if (existing?.id) return { serviceOrderId: existing.id as string, existed: true };
  }

  const customerResult = await findOrCreateCustomerByPhone({
    admin,
    phone: customerPhone,
    fullName: customerName,
    branchId
  });

  if (customerResult.error || !customerResult.customer) return { error: customerResult.error ?? "No se pudo resolver cliente" };

  const cleanAdditions = (additions ?? []).filter((item) => item.name && normalizeMoney(item.amount) > 0);
  const products = await resolveProductItems(admin, branchId, customerResult.customer.id, productItems ?? []);
  if (products.error) return { error: products.error };

  if (!serviceId && cleanAdditions.length === 0 && (products.items ?? []).length === 0) {
    return { error: missingAttentionItemsMessage };
  }

  const serviceAmount = serviceId ? await getServicePrice(admin, serviceId, total) : 0;
  const additionsTotal = cleanAdditions.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
  const productsTotal = (products.items ?? []).reduce((sum, item) => sum + normalizeMoney(item.originalUnitPrice * item.quantity), 0);
  const productDiscountTotal = (products.items ?? []).reduce((sum, item) => sum + normalizeMoney(item.discountAmount), 0);
  const subtotal = normalizeMoney(serviceAmount + additionsTotal + productsTotal);
  const totalDiscount = normalizeMoney(discountAmount + productDiscountTotal);
  const finalTotal = normalizeMoney(Math.max(subtotal - totalDiscount, 0));

  const { data: order, error } = await admin
    .from("service_orders")
    .insert({
      branch_id: branchId,
      reservation_id: reservationId ?? null,
      employee_id: employeeId,
      customer_id: customerResult.customer.id,
      service_id: serviceId ?? null,
      origin,
      status,
      subtotal,
      total: finalTotal,
      total_paid: 0,
      balance: finalTotal,
      discount_amount: totalDiscount,
      reward_redemption_id: rewardRedemptionId,
      attended_at: new Date().toISOString(),
      service_date: serviceDate ?? new Date().toISOString().slice(0, 10),
      observations: observations ?? null
    })
    .select("id")
    .single();

  if (error || !order) return { error: error?.message ?? "No se pudo crear servicio realizado" };

  const rows: Record<string, unknown>[] = [];
  if (serviceId) {
    const serviceName = await getServiceName(admin, serviceId);
    rows.push({
      service_order_id: order.id,
      item_type: "service",
      service_id: serviceId,
      name: serviceName,
      description: serviceName,
      quantity: 1,
      unit_price: serviceAmount,
      discount_amount: 0,
      amount: serviceAmount,
      subtotal: serviceAmount,
      barber_id: employeeId,
      branch_id: branchId
    });
  }

  if (cleanAdditions.length > 0) {
    rows.push(
      ...cleanAdditions.map((item) => ({
        service_order_id: order.id,
        item_type: "manual_extra",
        name: item.name,
        description: item.name,
        quantity: 1,
        unit_price: normalizeMoney(item.amount),
        discount_amount: 0,
        amount: normalizeMoney(item.amount),
        subtotal: normalizeMoney(item.amount),
        barber_id: employeeId,
        branch_id: branchId
      }))
    );
  }

  if (products.items?.length) {
    rows.push(...products.items.map((item) => ({
      service_order_id: order.id,
      item_type: "product",
      product_id: item.productId,
      name: item.name,
      description: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      original_unit_price: item.originalUnitPrice,
      discount_percent: item.discountPercent,
      discount_amount: item.discountAmount,
      discount_rule: item.discountRule,
      amount: item.subtotal,
      subtotal: item.subtotal,
      branch_id: branchId,
      sold_by_employee_id: item.soldByEmployeeId ?? employeeId,
      counts_for_seller_credit: item.countsForSellerCredit,
      seller_credit_amount: item.sellerCreditAmount
    })));
  }

  if (rows.length > 0) {
    const normalizedRows = rows.map(normalizeServiceOrderItemRow);
    let insertResult = await admin.from("service_order_items").insert(normalizedRows);
    if (insertResult.error && isMissingDiscountColumns(insertResult.error)) {
      const compatibleRows = normalizedRows.map(({ original_unit_price, discount_percent, discount_rule, ...row }) => row);
      insertResult = await admin.from("service_order_items").insert(compatibleRows);
    }
    if (insertResult.error) {
      await admin.from("service_orders").delete().eq("id", order.id);
      return { error: `No se pudieron guardar los items de la atencion: ${insertResult.error.message}` };
    }
  }
  if (products.items?.length) await decrementProductStock(admin, order.id, branchId, products.items);

  return {
    serviceOrderId: order.id as string,
    existed: false,
    customer: customerResult.customer,
    customerCreated: customerResult.created,
    customerNameDiffers: customerResult.nameDiffers
  };
}

export async function convertReservationToServiceOrder(admin: AdminClient, reservationId: string) {
  const { data: reservation, error } = await admin
    .from("reservations")
    .select("id,branch_id,customer_id,employee_id,service_id,price,observations,starts_at,customers(full_name,phone),services(name,price)")
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !reservation) return { error: error?.message ?? "Reserva no encontrada" };
  if (!reservation.employee_id || !reservation.service_id || !reservation.customer_id) {
    return { error: "Reserva incompleta para convertir en servicio realizado" };
  }

  const { data: existing } = await admin
    .from("service_orders")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (existing?.id) return { serviceOrderId: existing.id as string, existed: true };

  const customer = Array.isArray(reservation.customers) ? reservation.customers[0] : reservation.customers;
  const service = Array.isArray(reservation.services) ? reservation.services[0] : reservation.services;
  const total = normalizeMoney(reservation.price ?? service?.price ?? 0);

  const { data: order, error: orderError } = await admin
    .from("service_orders")
    .insert({
      branch_id: reservation.branch_id,
      reservation_id: reservationId,
      employee_id: reservation.employee_id,
      customer_id: reservation.customer_id,
      service_id: reservation.service_id,
      origin: "reservation",
      status: "pendiente_pago",
      subtotal: total,
      total,
      total_paid: 0,
      balance: total,
      attended_at: reservation.starts_at,
      service_date: String(reservation.starts_at).slice(0, 10),
      observations: reservation.observations ?? null
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "No se pudo convertir reserva" };

  await admin.from("service_order_items").insert({
    service_order_id: order.id,
    item_type: "service",
    service_id: reservation.service_id,
    name: service?.name ?? "Servicio",
    description: service?.name ?? "Servicio",
    quantity: 1,
    unit_price: total,
    amount: total,
    subtotal: total,
    barber_id: reservation.employee_id,
    branch_id: reservation.branch_id
  });

  return { serviceOrderId: order.id as string, existed: false, customerName: customer?.full_name };
}

export async function payServiceOrder(admin: AdminClient, serviceOrderId: string, method: PaymentMethod, splits?: PaymentSplit[], actorUserId?: string | null) {
  const { data: order, error } = await admin
    .from("service_orders")
    .select("id,total,status,service_id,branch_id,service_date,reward_redemption_id,service_order_items(item_type)")
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: error?.message ?? "Servicio no encontrado" }, { status: 404 });
  if (order.status === "anulado") return NextResponse.json({ error: "No se puede pagar un servicio anulado" }, { status: 400 });
  const { data: closure, error: closureError } = await admin
    .from("cash_closures")
    .select("id,status")
    .eq("branch_id", order.branch_id)
    .eq("closure_date", order.service_date)
    .eq("status", "closed")
    .maybeSingle();
  if (closureError && closureError.code !== "42P01") {
    return NextResponse.json({ error: closureError.message }, { status: 500 });
  }
  if (closure) {
    return NextResponse.json({ error: "La caja de esta sede y fecha esta cerrada. Un admin debe reabrirla antes de cobrar." }, { status: 409 });
  }
  const hasBillableItem = (order.service_order_items ?? []).some((item: any) => ["service", "custom_service", "manual_extra", "product", "snack"].includes(item.item_type));
  if (!hasBillableItem) return NextResponse.json({ error: missingPaymentItemsMessage }, { status: 400 });

  const total = normalizeMoney(order.total);
  if (total === 0 && !order.reward_redemption_id) return NextResponse.json({ error: "Total cero solo permitido con reward valido" }, { status: 400 });
  const paymentSplits = total === 0 ? [{ method: "reward" as const, amount: 0, reference: "classic_cut_free" }] : buildPaymentSplits(method, total, splits);
  const validation = validatePaymentSplits(total, paymentSplits);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });

  await admin.from("payment_details").delete().eq("service_order_id", serviceOrderId);
  if (paymentSplits.length > 0) {
    const { error: paymentError } = await admin.from("payment_details").insert(
      paymentSplits.map((split) => ({
        service_order_id: serviceOrderId,
        method: split.method,
        amount: split.amount,
        reference: split.reference ?? null
      }))
    );
    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("service_orders")
    .update({ status: "pagado", paid_at: new Date().toISOString(), total_paid: total, balance: 0 })
    .eq("id", serviceOrderId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await finalizeReward(admin, serviceOrderId, actorUserId);
  await countServiceOrderVisitOnce(admin, serviceOrderId, actorUserId);
  const production = await calculateProductionForPaidOrder(admin, serviceOrderId, actorUserId);
  if (production.error) return NextResponse.json({ error: production.error }, { status: 500 });
  return NextResponse.json({ ok: true, paid: total, production });
}

export async function applyRewardToServiceOrder({
  admin,
  serviceOrderId,
  rewardType,
  actorUserId
}: {
  admin: AdminClient;
  serviceOrderId: string;
  rewardType: "classic_cut" | "classic_cut_free";
  actorUserId?: string | null;
}) {
  if (!["classic_cut", "classic_cut_free"].includes(rewardType)) return { error: "Solo existe reward de corte clasico" };
  return applyClassicCutReward(admin, serviceOrderId, actorUserId);
}

function normalizeServiceOrderItemRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    discount_amount: normalizeMoney(row.discount_amount),
    seller_credit_amount: normalizeMoney(row.seller_credit_amount),
    counts_for_seller_credit: Boolean(row.counts_for_seller_credit),
    stock_controlled: Boolean(row.stock_controlled)
  };
}

function isMissingDiscountColumns(error: { code?: string; message?: string }) {
  const message = String(error.message ?? "");
  return error.code === "42703" || error.code === "PGRST204"
    || /original_unit_price|discount_percent|discount_rule/i.test(message);
}

async function getServiceName(admin: AdminClient, serviceId: string) {
  const { data } = await admin.from("services").select("name").eq("id", serviceId).maybeSingle();
  return data?.name ?? "Servicio";
}

async function getServicePrice(admin: AdminClient, serviceId: string, fallback: number) {
  const { data } = await admin.from("services").select("price,allow_manual_price").eq("id", serviceId).maybeSingle();
  return normalizeMoney(data?.allow_manual_price ? fallback : data?.price ?? fallback ?? 0);
}

async function resolveProductItems(admin: AdminClient, branchId: string, customerId: string, items: { productId: string; quantity: number; unitPrice?: number; soldByEmployeeId?: string | null }[]) {
  const resolved = [];
  for (const item of items) {
    const quantity = Math.trunc(Number(item.quantity ?? 0));
    if (!item.productId || quantity <= 0) return { error: "Cada producto debe tener cantidad mayor a 0" };
    const { data: product, error } = await admin
      .from("products")
      .select("id,name,sale_price,branch_id,is_active,category,counts_for_seller_credit,seller_credit_amount")
      .eq("id", item.productId)
      .maybeSingle();
    if (error || !product || !product.is_active) return { error: error?.message ?? "Producto no encontrado" };
    if (product.branch_id && product.branch_id !== branchId) return { error: `Producto fuera de la sede: ${product.name}` };
    const { data: branchStock } = await admin
      .from("product_branch_stock")
      .select("stock_current")
      .eq("product_id", item.productId)
      .eq("branch_id", branchId)
      .maybeSingle();
    const currentStock = Number(branchStock?.stock_current ?? 0);
    if (currentStock < quantity) return { error: `Stock insuficiente para ${product.name}` };
    const originalUnitPrice = normalizeMoney(item.unitPrice ?? product.sale_price ?? 0);
    const discount = await resolveCustomerProductDiscount(admin, customerId, product.category);
    const discountAmount = discount.eligible ? normalizeMoney(originalUnitPrice * quantity * discount.percent / 100) : 0;
    const unitPrice = discount.eligible ? normalizeMoney(originalUnitPrice * (1 - discount.percent / 100)) : originalUnitPrice;
    resolved.push({
      productId: product.id as string,
      name: product.name as string,
      quantity,
      unitPrice,
      originalUnitPrice,
      discountPercent: discount.eligible ? discount.percent : 0,
      discountAmount,
      discountRule: discount.eligible ? "customer_recurrent_barber_product" : null,
      subtotal: normalizeMoney(unitPrice * quantity),
      previousStock: currentStock,
      soldByEmployeeId: item.soldByEmployeeId ?? null,
      countsForSellerCredit: Boolean(product.counts_for_seller_credit || product.category === "barber_product"),
      sellerCreditAmount: Number(product.seller_credit_amount ?? 0)
    });
  }
  return { items: resolved };
}

async function decrementProductStock(
  admin: AdminClient,
  serviceOrderId: string,
  branchId: string,
  items: { productId: string; name: string; quantity: number; previousStock: number }[]
) {
  for (const item of items) {
    const newStock = item.previousStock - item.quantity;
    await admin
      .from("product_branch_stock")
      .update({ stock_current: newStock, updated_at: new Date().toISOString() })
      .eq("product_id", item.productId)
      .eq("branch_id", branchId);
    await admin.from("product_stock_movements").insert({
      product_id: item.productId,
      branch_id: branchId,
      service_order_id: serviceOrderId,
      movement_type: "sale",
      movement_kind: "venta",
      quantity: item.quantity,
      quantity_delta: -item.quantity,
      previous_stock: item.previousStock,
      new_stock: newStock,
      reason: "Venta en atencion"
    });
  }
}
