import type { SupabaseClient } from "@supabase/supabase-js";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

type AdminClient = SupabaseClient<any, "public", any>;

const defaults = {
  enabled: true,
  minVisits: 2,
  percent: 10,
  category: "barber_product"
};

export async function resolveCustomerProductDiscount(admin: AdminClient, customerId: string | null | undefined, productCategory: string | null | undefined) {
  if (!customerId || productCategory !== defaults.category) return { eligible: false, validVisits: 0, percent: 0 };
  const [{ data: customer }, { data: settings }, { data: orders }] = await Promise.all([
    admin.from("customers").select("phone,normalized_phone").eq("id", customerId).maybeSingle(),
    admin.from("app_settings").select("key,value").in("key", [
      "customer_product_discount_enabled",
      "customer_product_discount_min_visits",
      "customer_product_discount_percent",
      "customer_product_discount_product_category"
    ]),
    admin.from("service_orders")
      .select("id,status,voided_at,service_order_items(item_type)")
      .eq("customer_id", customerId)
      .eq("status", "pagado")
  ]);
  if (isGenericCustomerPhone(customer?.normalized_phone ?? customer?.phone)) return { eligible: false, validVisits: 0, percent: 0 };
  const config = Object.fromEntries((settings ?? []).map((row) => [row.key, row.value]));
  const enabled = config.customer_product_discount_enabled ?? defaults.enabled;
  const minVisits = Number(config.customer_product_discount_min_visits ?? defaults.minVisits);
  const percent = Number(config.customer_product_discount_percent ?? defaults.percent);
  const category = String(config.customer_product_discount_product_category ?? defaults.category);
  const validVisits = (orders ?? []).filter((order) =>
    !order.voided_at && (order.service_order_items ?? []).some((item: { item_type: string }) =>
      ["service", "custom_service", "manual_extra"].includes(item.item_type)
    )
  ).length;
  return { eligible: Boolean(enabled) && productCategory === category && validVisits >= minVisits, validVisits, percent };
}
