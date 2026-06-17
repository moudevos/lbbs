import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, "public", any>;

const VISITS_PER_REWARD = 6;

export async function syncRewardAccount(admin: AdminClient, customerId: string) {
  const { data: stats } = await admin
    .from("customer_visit_stats")
    .select("total_visits")
    .eq("customer_id", customerId)
    .maybeSingle();

  const { data: existing } = await admin
    .from("customer_reward_accounts")
    .select("redeemed_rewards")
    .eq("customer_id", customerId)
    .maybeSingle();

  const eligibleVisitCount = Number(stats?.total_visits ?? 0);
  const earnedRewards = Math.floor(eligibleVisitCount / VISITS_PER_REWARD);
  const redeemedRewards = Number(existing?.redeemed_rewards ?? 0);
  const availableRewards = Math.max(earnedRewards - redeemedRewards, 0);

  await admin.from("customer_reward_accounts").upsert(
    {
      customer_id: customerId,
      eligible_visit_count: eligibleVisitCount,
      earned_rewards: earnedRewards,
      redeemed_rewards: redeemedRewards,
      available_rewards: availableRewards,
      updated_at: new Date().toISOString()
    },
    { onConflict: "customer_id" }
  );

  return { eligibleVisitCount, earnedRewards, redeemedRewards, availableRewards };
}

export async function countServiceOrderVisitOnce(admin: AdminClient, serviceOrderId: string) {
  const { data: order, error } = await admin
    .from("service_orders")
    .select("id,customer_id,branch_id,created_at,visit_counted_at,status,service_id")
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (error || !order || !order.customer_id || order.visit_counted_at || order.status === "anulado") {
    return { counted: false, error: error?.message };
  }

  if (!order.service_id) {
    const { data: serviceItems } = await admin
      .from("service_order_items")
      .select("id")
      .eq("service_order_id", serviceOrderId)
      .in("item_type", ["service", "custom_service"])
      .limit(1);
    if (!serviceItems || serviceItems.length === 0) {
      return { counted: false, error: "La atencion no incluye servicio valido para rewards" };
    }
  }

  const now = new Date().toISOString();
  const { data: stats } = await admin
    .from("customer_visit_stats")
    .select("customer_id,total_attended_reservations,total_service_orders")
    .eq("customer_id", order.customer_id)
    .maybeSingle();

  const attended = Number(stats?.total_attended_reservations ?? 0);
  const orders = Number(stats?.total_service_orders ?? 0) + 1;

  const { error: upsertError } = await admin.from("customer_visit_stats").upsert(
    {
      customer_id: order.customer_id,
      total_attended_reservations: attended,
      total_service_orders: orders,
      total_visits: attended + orders,
      last_visit_at: order.created_at,
      updated_at: now
    },
    { onConflict: "customer_id" }
  );

  if (upsertError) return { counted: false, error: upsertError.message };

  const before = await syncRewardAccount(admin, order.customer_id);
  const { error: updateError } = await admin
    .from("service_orders")
    .update({ visit_counted_at: now })
    .eq("id", serviceOrderId)
    .is("visit_counted_at", null);

  if (updateError) return { counted: false, error: updateError.message };

  const after = await syncRewardAccount(admin, order.customer_id);
  await admin.from("customer_reward_ledger").insert({
    customer_id: order.customer_id,
    event_type: "visit_counted",
    service_order_id: serviceOrderId,
    branch_id: order.branch_id,
    points_delta: 1,
    reward_delta: 0,
    description: "Servicio realizado contabilizado"
  });

  const rewardDelta = after.earnedRewards - before.earnedRewards;
  if (rewardDelta > 0) {
    await admin.from("customer_reward_ledger").insert({
      customer_id: order.customer_id,
      event_type: "reward_earned",
      service_order_id: serviceOrderId,
      branch_id: order.branch_id,
      points_delta: 0,
      reward_delta: rewardDelta,
      description: `Recompensa generada cada ${VISITS_PER_REWARD} atenciones`
    });
  }

  return { counted: true, error: null };
}

export async function redeemCustomerReward({
  admin,
  customerId,
  branchId,
  serviceOrderId,
  rewardType,
  redeemedBy
}: {
  admin: AdminClient;
  customerId: string;
  branchId: string;
  serviceOrderId?: string | null;
  rewardType: "classic_cut" | "voucher_30";
  redeemedBy?: string | null;
}) {
  const account = await syncRewardAccount(admin, customerId);
  if (account.availableRewards <= 0) return { error: "Cliente sin recompensas disponibles" };

  const amountValue = rewardType === "voucher_30" ? 30 : await getClassicCutValue(admin);
  const { data: redemption, error } = await admin
    .from("customer_reward_redemptions")
    .insert({
      customer_id: customerId,
      reward_type: rewardType,
      branch_id: branchId,
      service_order_id: serviceOrderId ?? null,
      amount_value: amountValue,
      redeemed_by: redeemedBy ?? null,
      status: "redeemed"
    })
    .select("id,amount_value")
    .single();

  if (error || !redemption) return { error: error?.message ?? "No se pudo canjear recompensa" };

  await admin.from("customer_reward_ledger").insert({
    customer_id: customerId,
    event_type: "reward_redeemed",
    service_order_id: serviceOrderId ?? null,
    branch_id: branchId,
    points_delta: 0,
    reward_delta: -1,
    description: rewardType === "voucher_30" ? "Vale de S/30 canjeado" : "Corte clasico gratis canjeado"
  });

  await admin.from("customer_reward_accounts").upsert(
    {
      customer_id: customerId,
      eligible_visit_count: account.eligibleVisitCount,
      earned_rewards: account.earnedRewards,
      redeemed_rewards: account.redeemedRewards + 1,
      available_rewards: Math.max(account.availableRewards - 1, 0),
      updated_at: new Date().toISOString()
    },
    { onConflict: "customer_id" }
  );

  return { redemptionId: redemption.id as string, amountValue: Number(redemption.amount_value ?? amountValue) };
}

async function getClassicCutValue(admin: AdminClient) {
  const { data } = await admin
    .from("services")
    .select("price")
    .or("sku.eq.SRV-0001,name.ilike.%clasico%,name.ilike.%clásico%")
    .order("sku")
    .limit(1)
    .maybeSingle();

  return Number(data?.price ?? 30);
}
