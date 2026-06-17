import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCustomerByPhone } from "@/lib/reservations/server";
import { countServiceOrderVisitOnce, redeemCustomerReward } from "@/lib/rewards/server";
import { calculateProductionForPaidOrder } from "@/lib/production/server";
import type { PaymentMethod, PaymentSplit } from "./types";

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
  if (splits.length === 0) return "Debe registrar al menos un pago";
  if (splits.some((split) => normalizeMoney(split.amount) <= 0)) {
    return "Cada pago debe tener metodo valido y monto mayor a 0";
  }
  const paid = normalizeMoney(splits.reduce((sum, split) => sum + normalizeMoney(split.amount), 0));
  return paid === normalizeMoney(total) ? null : "La suma de pagos debe coincidir exactamente con el total";
}

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
  rewardRedemptionId = null
}: {
  admin: AdminClient;
  branchId: string;
  customerPhone: string;
  customerName: string;
  employeeId: string;
  serviceId?: string | null;
  total: number;
  additions?: { name: string; amount: number }[];
  productItems?: { productId: string; quantity: number; unitPrice?: number }[];
  observations?: string | null;
  reservationId?: string | null;
  origin?: "walk_in" | "reservation";
  discountAmount?: number;
  rewardRedemptionId?: string | null;
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
  const products = await resolveProductItems(admin, branchId, productItems ?? []);
  if (products.error) return { error: products.error };

  const serviceAmount = serviceId ? await getServicePrice(admin, serviceId, total) : 0;
  const additionsTotal = cleanAdditions.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
  const productsTotal = (products.items ?? []).reduce((sum, item) => sum + normalizeMoney(item.subtotal), 0);
  const subtotal = normalizeMoney(serviceAmount + additionsTotal + productsTotal);
  const finalTotal = normalizeMoney(total || Math.max(subtotal - normalizeMoney(discountAmount), 0));

  const { data: order, error } = await admin
    .from("service_orders")
    .insert({
      branch_id: branchId,
      reservation_id: reservationId ?? null,
      employee_id: employeeId,
      customer_id: customerResult.customer.id,
      service_id: serviceId ?? null,
      origin,
      status: "registrado",
      subtotal,
      total: finalTotal,
      total_paid: 0,
      balance: finalTotal,
      discount_amount: normalizeMoney(discountAmount),
      reward_redemption_id: rewardRedemptionId,
      attended_at: new Date().toISOString(),
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
      amount: item.subtotal,
      subtotal: item.subtotal,
      branch_id: branchId
    })));
  }

  if (rows.length > 0) await admin.from("service_order_items").insert(rows);
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
      status: "registrado",
      subtotal: total,
      total,
      total_paid: 0,
      balance: total,
      attended_at: reservation.starts_at,
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
    .select("id,total,status,service_id")
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: error?.message ?? "Servicio no encontrado" }, { status: 404 });
  if (order.status === "anulado") return NextResponse.json({ error: "No se puede pagar un servicio anulado" }, { status: 400 });

  const total = normalizeMoney(order.total);
  const paymentSplits = buildPaymentSplits(method, total, splits);
  const validation = validatePaymentSplits(total, paymentSplits);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });

  await admin.from("payment_details").delete().eq("service_order_id", serviceOrderId);
  const { error: paymentError } = await admin.from("payment_details").insert(
    paymentSplits.map((split) => ({
      service_order_id: serviceOrderId,
      method: split.method,
      amount: split.amount,
      reference: split.reference ?? null
    }))
  );
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });

  const { error: updateError } = await admin
    .from("service_orders")
    .update({ status: "pagado", paid_at: new Date().toISOString(), total_paid: total, balance: 0 })
    .eq("id", serviceOrderId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await countServiceOrderVisitOnce(admin, serviceOrderId);
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
  rewardType: "classic_cut" | "voucher_30";
  actorUserId?: string | null;
}) {
  const { data: order, error } = await admin
    .from("service_orders")
    .select("id,customer_id,branch_id,total,subtotal,discount_amount,total_paid,status")
    .eq("id", serviceOrderId)
    .maybeSingle();
  if (error || !order) return { error: error?.message ?? "Servicio no encontrado" };
  if (order.status !== "registrado") return { error: "Solo se puede canjear reward antes de pagar" };

  const redeemed = await redeemCustomerReward({
    admin,
    customerId: order.customer_id,
    branchId: order.branch_id,
    serviceOrderId,
    rewardType,
    redeemedBy: actorUserId ?? null
  });
  if (redeemed.error) return redeemed;

  const discount = Math.min(normalizeMoney(redeemed.amountValue), normalizeMoney(order.total));
  const nextTotal = Math.max(normalizeMoney(order.total) - discount, 0);
  const nextDiscount = normalizeMoney(order.discount_amount) + discount;
  const { error: updateError } = await admin
    .from("service_orders")
    .update({
      total: nextTotal,
      balance: Math.max(nextTotal - normalizeMoney(order.total_paid), 0),
      discount_amount: nextDiscount,
      reward_redemption_id: redeemed.redemptionId
    })
    .eq("id", serviceOrderId);

  if (updateError) return { error: updateError.message };

  await admin.from("service_order_items").insert({
    service_order_id: serviceOrderId,
    item_type: "reward_discount",
    name: rewardType === "voucher_30" ? "Vale S/30" : "Corte clasico gratis",
    description: "Descuento por recompensa",
    quantity: 1,
    unit_price: -discount,
    amount: -discount,
    subtotal: -discount,
    discount_amount: discount,
    branch_id: order.branch_id
  });

  return { discount, redemptionId: redeemed.redemptionId };
}

async function getServiceName(admin: AdminClient, serviceId: string) {
  const { data } = await admin.from("services").select("name").eq("id", serviceId).maybeSingle();
  return data?.name ?? "Servicio";
}

async function getServicePrice(admin: AdminClient, serviceId: string, fallback: number) {
  const { data } = await admin.from("services").select("price").eq("id", serviceId).maybeSingle();
  return normalizeMoney(data?.price ?? fallback ?? 0);
}

async function resolveProductItems(admin: AdminClient, branchId: string, items: { productId: string; quantity: number; unitPrice?: number }[]) {
  const resolved = [];
  for (const item of items) {
    const quantity = Math.trunc(Number(item.quantity ?? 0));
    if (!item.productId || quantity <= 0) return { error: "Cada producto debe tener cantidad mayor a 0" };
    const { data: product, error } = await admin
      .from("products")
      .select("id,name,sale_price,branch_id,is_active")
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
    const unitPrice = normalizeMoney(item.unitPrice ?? product.sale_price ?? 0);
    resolved.push({
      productId: product.id as string,
      name: product.name as string,
      quantity,
      unitPrice,
      subtotal: normalizeMoney(unitPrice * quantity),
      previousStock: currentStock
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
