import { NextResponse, type NextRequest } from "next/server";
import { authenticateLocalDevice } from "@/lib/local/authenticate-local-device";
import { normalizePhone } from "@/lib/customers/phone";

export async function GET(request: NextRequest) {
  const context = await authenticateLocalDevice(request);
  if ("error" in context) return context.error;
  const normalized = normalizePhone(request.nextUrl.searchParams.get("phone") ?? "");
  if (!normalized) return NextResponse.json({ error: "Celular requerido" }, { status: 400 });
  const { data, error } = await context.admin.from("customers")
    .select("id,full_name,phone,branch_id,customer_visit_stats(total_visits),customer_reward_accounts(available_rewards)")
    .eq("normalized_phone", normalized)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ found: false });
  const stats = Array.isArray(data.customer_visit_stats) ? data.customer_visit_stats[0] : data.customer_visit_stats;
  const rewards = Array.isArray(data.customer_reward_accounts) ? data.customer_reward_accounts[0] : data.customer_reward_accounts;
  return NextResponse.json({
    found: true,
    customer: {
      id: data.id,
      name: data.full_name,
      phone: data.phone,
      totalVisits: Number(stats?.total_visits ?? 0),
      availableRewards: Number(rewards?.available_rewards ?? 0)
    }
  });
}
