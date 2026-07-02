import type { SupabaseClient } from "@supabase/supabase-js";
import { isRewardEligibleOrder } from "./is-reward-eligible-order";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

type AdminClient = SupabaseClient<any, "public", any>;
export const VISITS_PER_REWARD = 6;
export const REWARD_BARBER_EARNING = 10;
export const CLASSIC_CUT_REWARD_PRICE = 30;

export async function syncRewardAccount(admin: AdminClient, customerId: string) {
  const { data: customer } = await admin.from("customers").select("phone,normalized_phone").eq("id", customerId).maybeSingle();
  if (isGenericCustomerPhone(customer?.normalized_phone ?? customer?.phone)) {
    await admin.from("customer_reward_accounts").upsert({
      customer_id: customerId, eligible_visit_count: 0, earned_rewards: 0,
      redeemed_rewards: 0, available_rewards: 0, updated_at: new Date().toISOString()
    }, { onConflict: "customer_id" });
    return { eligibleVisitCount: 0, earnedRewards: 0, redeemedRewards: 0, availableRewards: 0, progress: 0, reason: "Cliente generico no participa en rewards." };
  }
  const { data: orders } = await admin
    .from("service_orders")
    .select("id,status,total,voided_at,reward_redemption_id,service_order_items(item_type,subtotal,amount)")
    .eq("customer_id", customerId)
    .eq("status", "pagado");
  const eligibleVisitCount = (orders ?? []).filter((order) => isRewardEligibleOrder(order).eligible).length;
  const { data: redemptions } = await admin
    .from("customer_reward_redemptions")
    .select("status")
    .eq("customer_id", customerId)
    .in("status", ["applied", "redeemed"]);
  const { data: manualGrants } = await admin
    .from("customer_reward_ledger")
    .select("reward_delta")
    .eq("customer_id", customerId)
    .eq("event_type", "reward_manual_grant");
  const redeemedRewards = (redemptions ?? []).filter((row) => row.status === "redeemed").length;
  const reservedRewards = (redemptions ?? []).filter((row) => row.status === "applied").length;
  const earnedRewards = Math.floor(eligibleVisitCount / VISITS_PER_REWARD);
  const manualRewards = (manualGrants ?? []).reduce((sum, row) => sum + Math.max(Number(row.reward_delta ?? 0), 0), 0);
  const availableRewards = Math.max(earnedRewards + manualRewards - redeemedRewards - reservedRewards, 0);
  await admin.from("customer_reward_accounts").upsert({
    customer_id: customerId,
    eligible_visit_count: eligibleVisitCount,
    earned_rewards: earnedRewards,
    redeemed_rewards: redeemedRewards,
    available_rewards: availableRewards,
    updated_at: new Date().toISOString()
  }, { onConflict: "customer_id" });
  return { eligibleVisitCount, earnedRewards, manualRewards, redeemedRewards, availableRewards, progress: eligibleVisitCount % VISITS_PER_REWARD };
}

export async function grantInitialReward(admin: AdminClient, customerId: string, createdBy: string | null, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Motivo requerido" };
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id,phone,normalized_phone,branch_id")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError || !customer) return { error: customerError?.message ?? "Cliente no encontrado" };
  if (isGenericCustomerPhone(customer.normalized_phone ?? customer.phone)) return { error: "Cliente generico no participa en rewards." };

  const { error } = await admin.from("customer_reward_ledger").insert({
    customer_id: customer.id,
    event_type: "reward_manual_grant",
    branch_id: customer.branch_id,
    points_delta: 0,
    reward_delta: 1,
    cycle_number: 1,
    description: `Migracion tarjeta fisica: ${cleanReason}`,
    created_by: createdBy
  });
  if (error) {
    if (error.code === "23505") return { error: "Este cliente ya tiene una asignacion inicial de reward." };
    return { error: error.message };
  }
  const account = await syncRewardAccount(admin, customer.id);
  return { ok: true, account };
}

export async function countServiceOrderVisitOnce(admin: AdminClient, serviceOrderId: string, createdBy?: string | null) {
  const { data: order, error } = await admin
    .from("service_orders")
    .select("id,customer_id,branch_id,status,total,voided_at,reward_redemption_id,visit_counted_at,customers(phone,normalized_phone),service_order_items(item_type,subtotal,amount)")
    .eq("id", serviceOrderId)
    .maybeSingle();
  if (error || !order?.customer_id) return { counted: false, error: error?.message };
  const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
  if (isGenericCustomerPhone(customer?.normalized_phone ?? customer?.phone)) {
    return { counted: false, error: "Cliente generico no participa en rewards." };
  }
  const eligibility = isRewardEligibleOrder(order);
  if (!eligibility.eligible) return { counted: false, error: eligibility.reason };
  if (order.visit_counted_at) return { counted: false };

  const before = await syncRewardAccount(admin, order.customer_id);
  const now = new Date().toISOString();
  const { data: marked } = await admin.from("service_orders").update({ visit_counted_at: now }).eq("id", serviceOrderId).is("visit_counted_at", null).select("id").maybeSingle();
  if (!marked) return { counted: false };
  await admin.from("customer_reward_ledger").insert({
    customer_id: order.customer_id, event_type: "visit_counted", service_order_id: serviceOrderId,
    branch_id: order.branch_id, points_delta: 1, reward_delta: 0,
    cycle_number: Math.floor(before.eligibleVisitCount / VISITS_PER_REWARD) + 1,
    description: "Atencion pagada con servicio valido", created_by: createdBy ?? null
  });
  const after = await syncRewardAccount(admin, order.customer_id);
  if (after.earnedRewards > before.earnedRewards) {
    await admin.from("customer_reward_ledger").insert({
      customer_id: order.customer_id, event_type: "reward_earned", service_order_id: serviceOrderId,
      branch_id: order.branch_id, reward_delta: 1, cycle_number: after.earnedRewards,
      description: "Corte clasico gratis disponible", created_by: createdBy ?? null
    });
  }
  return { counted: true };
}

export async function applyClassicCutReward(admin: AdminClient, serviceOrderId: string, createdBy?: string | null) {
  const { data: order } = await admin.from("service_orders")
    .select("id,customer_id,branch_id,employee_id,status,total,discount_amount,reward_redemption_id,customers(phone,normalized_phone),service_order_items(id,item_type,name,description,subtotal,amount,unit_price,original_unit_price,barber_id)")
    .eq("id", serviceOrderId).maybeSingle();
  if (!order?.customer_id) return { error: "Atencion o cliente no encontrado" };
  const rewardCustomer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
  if (isGenericCustomerPhone(rewardCustomer?.normalized_phone ?? rewardCustomer?.phone)) return { error: "Cliente generico no participa en rewards." };
  if (!["registrado", "pendiente_pago"].includes(order.status)) return { error: "Solo se aplica antes de pagar" };
  if (order.reward_redemption_id) return { error: "La atencion ya tiene reward aplicado" };
  const classic = (order.service_order_items ?? []).find((item: any) => {
    const text = `${item.name ?? ""} ${item.description ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return ["service", "custom_service"].includes(item.item_type) && text.includes("corte") && text.includes("clasico");
  });
  if (!classic) return { error: "Reward disponible solo para Corte Clasico" };
  const classicPrice = Number(classic.original_unit_price ?? classic.unit_price ?? classic.subtotal ?? classic.amount ?? 0);
  if (Math.abs(classicPrice - CLASSIC_CUT_REWARD_PRICE) > 0.01) return { error: "Reward disponible solo para Corte Clasico de S/ 30.00" };
  const account = await syncRewardAccount(admin, order.customer_id);
  if (account.availableRewards < 1) return { error: "Cliente sin reward disponible" };
  const rewardValue = Number(classic.subtotal ?? 0);
  const { data: redemption, error } = await admin.from("customer_reward_redemptions").insert({
    customer_id: order.customer_id, service_order_id: order.id, branch_id: order.branch_id,
    barber_id: classic.barber_id ?? order.employee_id, reward_type: "classic_cut_free",
    amount_value: rewardValue, reward_value: rewardValue, barber_fixed_earning: REWARD_BARBER_EARNING,
    status: "applied", redeemed_at: null, redeemed_by: createdBy ?? null, created_by: createdBy ?? null
  }).select("id").single();
  if (error || !redemption) return { error: error?.message ?? "No se pudo aplicar reward" };
  const nextTotal = Math.max(Number(order.total ?? 0) - rewardValue, 0);
  await admin.from("service_orders").update({
    total: nextTotal, balance: nextTotal, discount_amount: Number(order.discount_amount ?? 0) + rewardValue,
    reward_redemption_id: redemption.id
  }).eq("id", order.id);
  await admin.from("service_order_items").insert({
    service_order_id: order.id, item_type: "reward_discount", name: "Corte clasico gratis",
    description: "Reward corte clasico", quantity: 1, unit_price: -rewardValue, amount: -rewardValue,
    subtotal: -rewardValue, discount_amount: rewardValue, branch_id: order.branch_id
  });
  await admin.from("customer_reward_ledger").insert({
    customer_id: order.customer_id, event_type: "reward_applied", service_order_id: order.id,
    branch_id: order.branch_id, reward_delta: 0, cycle_number: account.earnedRewards,
    description: "Reward reservado antes del pago", created_by: createdBy ?? null
  });
  await syncRewardAccount(admin, order.customer_id);
  return { redemptionId: redemption.id, discount: rewardValue };
}

export async function finalizeReward(admin: AdminClient, serviceOrderId: string, createdBy?: string | null) {
  const now = new Date().toISOString();
  const { data: redemption } = await admin.from("customer_reward_redemptions").select("*").eq("service_order_id", serviceOrderId).eq("status", "applied").maybeSingle();
  if (!redemption) return { finalized: false };
  await admin.from("customer_reward_redemptions").update({ status: "redeemed", redeemed_at: now }).eq("id", redemption.id);
  await admin.from("customer_reward_ledger").insert({
    customer_id: redemption.customer_id, event_type: "reward_redeemed", service_order_id: serviceOrderId,
    branch_id: redemption.branch_id, reward_delta: -1, description: "Corte clasico gratis canjeado",
    created_by: createdBy ?? null
  });
  await syncRewardAccount(admin, redemption.customer_id);
  return { finalized: true, redemption };
}

export async function removeAppliedReward(admin: AdminClient, serviceOrderId: string, createdBy?: string | null) {
  const { data: order } = await admin.from("service_orders").select("id,status,customer_id,branch_id,total,discount_amount,reward_redemption_id").eq("id", serviceOrderId).maybeSingle();
  if (!order?.reward_redemption_id) return { error: "La atencion no tiene reward aplicado" };
  if (order.status === "pagado") return { error: "No se puede quitar reward despues del pago" };
  const { data: redemption } = await admin.from("customer_reward_redemptions").select("*").eq("id", order.reward_redemption_id).maybeSingle();
  if (!redemption || redemption.status !== "applied") return { error: "Reward no removible" };
  const value = Number(redemption.reward_value ?? redemption.amount_value ?? 0);
  await admin.from("service_order_items").delete().eq("service_order_id", serviceOrderId).eq("item_type", "reward_discount");
  await admin.from("service_orders").update({
    total: Number(order.total ?? 0) + value, balance: Number(order.total ?? 0) + value,
    discount_amount: Math.max(Number(order.discount_amount ?? 0) - value, 0), reward_redemption_id: null
  }).eq("id", serviceOrderId);
  await admin.from("customer_reward_redemptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", redemption.id);
  await admin.from("customer_reward_ledger").insert({
    customer_id: order.customer_id, event_type: "reward_cancelled", service_order_id: serviceOrderId,
    branch_id: order.branch_id, description: "Reward liberado antes del pago", created_by: createdBy ?? null
  });
  await syncRewardAccount(admin, order.customer_id);
  return { removed: true };
}
