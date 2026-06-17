import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET(request: Request) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const branchId = new URL(request.url).searchParams.get("branch_id");
  const scope = resolveBranchScope(context.employee, branchId);
  let query = context.admin.from("customers").select("full_name,phone,branches(name),customer_visit_stats(total_visits,last_visit_at),customer_reward_accounts(available_rewards)");
  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else {
    query = query.eq("branch_id", context.employee.branchId);
  }
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });
  return xlsxResponse("clientes.xlsx", "clientes", (data ?? []).map((row: any) => {
    const stats = Array.isArray(row.customer_visit_stats) ? row.customer_visit_stats[0] : row.customer_visit_stats;
    const rewards = Array.isArray(row.customer_reward_accounts) ? row.customer_reward_accounts[0] : row.customer_reward_accounts;
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return { cliente: row.full_name, celular: row.phone, sede: branch?.name, total_atenciones: stats?.total_visits ?? 0, rewards_disponibles: rewards?.available_rewards ?? 0, ultima_atencion: stats?.last_visit_at ?? "" };
  }));
}
