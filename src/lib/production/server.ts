import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateProductSellerCredit, calculateServiceProduction, money } from "./calculate-barber-production";

type AdminClient = SupabaseClient<any, "public", any>;

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function productionPercentage(admin: AdminClient, barberId: string, countedAt: string) {
  const effectiveDate = countedAt.slice(0, 10);
  const { data } = await admin
    .from("barber_production_settings")
    .select("percentage")
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .lte("effective_from", effectiveDate)
    .or(`effective_to.is.null,effective_to.gte.${effectiveDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number(data?.percentage ?? 50);
}

export async function calculateProductionForPaidOrder(admin: AdminClient, serviceOrderId: string, actorUserId?: string | null) {
  const { data: existing, error: existingError } = await admin
    .from("barber_production_entries")
    .select("id")
    .eq("service_order_id", serviceOrderId)
    .is("voided_at", null)
    .limit(1);

  if (existingError) return { error: existingError.message };
  if ((existing ?? []).length > 0) return { skipped: true };

  const { data: order, error } = await admin
    .from("service_orders")
    .select(`
      id,status,branch_id,employee_id,customer_id,reservation_id,attended_at,
      service_order_items(
        id,item_type,service_id,product_id,name,description,quantity,unit_price,amount,subtotal,barber_id,branch_id,
        sold_by_employee_id,seller_credit_amount,counts_for_seller_credit,
        products(id,name,category,counts_for_seller_credit,seller_credit_amount)
      )
    `)
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (error || !order) return { error: error?.message ?? "Atencion no encontrada" };
  if (order.status !== "pagado") return { skipped: true };

  const rows: Record<string, unknown>[] = [];
  const countedAt = new Date().toISOString();

  for (const item of order.service_order_items ?? []) {
    const itemType = String(item.item_type ?? "");

    if (["service", "custom_service", "manual_extra"].includes(itemType)) {
      const barberId = item.barber_id ?? order.employee_id;
      if (!barberId) continue;
      const gross = money(item.subtotal ?? item.amount ?? item.unit_price);
      const percentage = await productionPercentage(admin, barberId, order.attended_at ?? countedAt);
      const calculated = calculateServiceProduction({ grossAmount: gross, percentage });
      rows.push({
        service_order_id: order.id,
        service_order_item_id: item.id,
        reservation_id: order.reservation_id,
        branch_id: item.branch_id ?? order.branch_id,
        barber_id: barberId,
        service_id: item.service_id,
        customer_id: order.customer_id,
        entry_type: "service",
        gross_amount: calculated.grossAmount,
        deduction_amount: calculated.deductionAmount,
        production_amount: calculated.productionAmount,
        percentage: calculated.percentage,
        barber_earning: calculated.barberEarning,
        quantity: Number(item.quantity ?? 1),
        description: item.name ?? item.description ?? "Servicio",
        counted_at: countedAt,
        created_by: actorUserId ?? null
      });
    }

    if (itemType === "product") {
      const product = first(item.products);
      const counts = Boolean(item.counts_for_seller_credit ?? product?.counts_for_seller_credit);
      const sellerId = item.sold_by_employee_id;
      if (!counts || !sellerId) continue;
      const quantity = Number(item.quantity ?? 1);
      const credit = calculateProductSellerCredit({
        quantity,
        countsForSellerCredit: counts,
        category: product?.category,
        sellerCreditAmount: item.seller_credit_amount ?? product?.seller_credit_amount ?? 2
      });
      rows.push({
        service_order_id: order.id,
        service_order_item_id: item.id,
        reservation_id: order.reservation_id,
        branch_id: item.branch_id ?? order.branch_id,
        barber_id: sellerId,
        customer_id: order.customer_id,
        entry_type: "product_credit",
        gross_amount: money(item.subtotal ?? item.amount),
        deduction_amount: 0,
        production_amount: credit.productionAmount,
        percentage: 100,
        barber_earning: credit.barberEarning,
        sold_by_employee_id: sellerId,
        product_id: item.product_id,
        quantity,
        description: item.name ?? product?.name ?? "Producto",
        counted_at: countedAt,
        created_by: actorUserId ?? null
      });
    }
  }

  if (rows.length === 0) return { inserted: 0 };
  const { error: insertError } = await admin.from("barber_production_entries").insert(rows);
  if (insertError) return { error: insertError.message };
  return { inserted: rows.length };
}

export async function voidProductionForOrder(admin: AdminClient, serviceOrderId: string, actorUserId?: string | null) {
  const now = new Date().toISOString();
  const { data: active, error } = await admin
    .from("barber_production_entries")
    .select("*")
    .eq("service_order_id", serviceOrderId)
    .is("voided_at", null);

  if (error) return { error: error.message };
  if (!active?.length) return { voided: 0 };

  const { error: updateError } = await admin
    .from("barber_production_entries")
    .update({ voided_at: now })
    .eq("service_order_id", serviceOrderId)
    .is("voided_at", null);

  if (updateError) return { error: updateError.message };

  const reversals = active.map((entry) => ({
    service_order_id: entry.service_order_id,
    service_order_item_id: entry.service_order_item_id,
    reservation_id: entry.reservation_id,
    branch_id: entry.branch_id,
    barber_id: entry.barber_id,
    service_id: entry.service_id,
    customer_id: entry.customer_id,
    entry_type: "reversal",
    gross_amount: -money(entry.gross_amount),
    deduction_amount: -money(entry.deduction_amount),
    production_amount: -money(entry.production_amount),
    percentage: Number(entry.percentage ?? 0),
    barber_earning: -money(entry.barber_earning),
    sold_by_employee_id: entry.sold_by_employee_id,
    product_id: entry.product_id,
    quantity: Number(entry.quantity ?? 1),
    description: `Reversion: ${entry.description ?? ""}`.trim(),
    counted_at: now,
    created_by: actorUserId ?? null
  }));

  const { error: insertError } = await admin.from("barber_production_entries").insert(reversals);
  if (insertError) return { error: insertError.message };
  return { voided: active.length };
}
