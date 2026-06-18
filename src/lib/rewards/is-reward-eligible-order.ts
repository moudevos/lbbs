export type RewardEligibleItem = {
  item_type?: string | null;
  subtotal?: number | string | null;
  amount?: number | string | null;
};

export type RewardEligibleOrder = {
  status?: string | null;
  total?: number | string | null;
  voided_at?: string | null;
  reward_redemption_id?: string | null;
  service_order_items?: RewardEligibleItem[] | null;
};

export function isRewardEligibleOrder(order: RewardEligibleOrder) {
  if (order.voided_at || order.status === "anulado") return { eligible: false, reason: "order_voided" };
  if (order.status !== "pagado") return { eligible: false, reason: "order_not_paid" };
  if (order.reward_redemption_id) return { eligible: false, reason: "reward_order" };
  if (Number(order.total ?? 0) <= 0) return { eligible: false, reason: "zero_total" };
  const services = (order.service_order_items ?? []).filter((item) =>
    ["service", "custom_service", "manual_service"].includes(String(item.item_type ?? ""))
  );
  if (!services.length) return { eligible: false, reason: "no_service_item" };
  if (!services.some((item) => Number(item.subtotal ?? item.amount ?? 0) > 0)) {
    return { eligible: false, reason: "no_paid_service" };
  }
  return { eligible: true };
}
