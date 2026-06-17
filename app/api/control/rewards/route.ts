import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const branchId = request.nextUrl.searchParams.get("branch_id");
  const scope = resolveBranchScope(context.employee, branchId);
  let query = context.admin
    .from("customers")
    .select("id,full_name,phone,branch_id,branches(name),customer_visit_stats(total_visits,last_visit_at),customer_reward_accounts(eligible_visit_count,earned_rewards,redeemed_rewards,available_rewards)")
    .order("full_name");

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else {
    query = query.eq("branch_id", context.employee.branchId);
  }
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    rewards: (data ?? []).map((customer: any) => {
      const stats = Array.isArray(customer.customer_visit_stats) ? customer.customer_visit_stats[0] : customer.customer_visit_stats;
      const account = Array.isArray(customer.customer_reward_accounts) ? customer.customer_reward_accounts[0] : customer.customer_reward_accounts;
      return {
        id: customer.id,
        name: customer.full_name,
        phone: customer.phone,
        branchName: Array.isArray(customer.branches) ? customer.branches[0]?.name : customer.branches?.name,
        totalVisits: Number(stats?.total_visits ?? account?.eligible_visit_count ?? 0),
        progress: Number(stats?.total_visits ?? account?.eligible_visit_count ?? 0) % 6,
        availableRewards: Number(account?.available_rewards ?? 0),
        earnedRewards: Number(account?.earned_rewards ?? 0),
        redeemedRewards: Number(account?.redeemed_rewards ?? 0),
        lastVisitAt: stats?.last_visit_at ?? null
      };
    })
  });
}
