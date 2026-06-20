import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const branchId = context.employee.role === "recepcion" ? context.employee.branchId : request.nextUrl.searchParams.get("branch_id");
  let accountsQuery = context.admin.from("customer_reward_accounts").select("customer_id,eligible_visit_count,available_rewards,redeemed_rewards,customers(full_name,phone,branch_id,branches(name))");
  let redemptionQuery = context.admin.from("customer_reward_redemptions").select("id,status,branch_id,barber_id,barber_fixed_earning,redeemed_at,employees(first_name,last_name),branches(name)");
  if (branchId && branchId !== "all") redemptionQuery = redemptionQuery.eq("branch_id", branchId);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (from) redemptionQuery = redemptionQuery.gte("redeemed_at", `${from}T00:00:00`);
  if (to) redemptionQuery = redemptionQuery.lte("redeemed_at", `${to}T23:59:59`);
  const [{ data: accounts }, { data: redemptions }] = await Promise.all([accountsQuery, redemptionQuery]);
  const scopedAccounts = (accounts ?? []).filter((row: any) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return !isGenericCustomerPhone(customer?.phone) && (!branchId || branchId === "all" || customer?.branch_id === branchId);
  });
  const redeemed = (redemptions ?? []).filter((row: any) => row.status === "redeemed");
  const available = scopedAccounts.filter((row: any) => Number(row.available_rewards) > 0);
  const group = (rows: any[], key: string, label: (row: any) => string) => Array.from(rows.reduce((map, row) => {
    const id = row[key] ?? "none"; const current = map.get(id) ?? { id, name: label(row), count: 0, total: 0 };
    current.count += 1; current.total += Number(row.barber_fixed_earning ?? 10); map.set(id, current); return map;
  }, new Map()).values());
  return NextResponse.json({
    availableClients: available.length,
    redeemedRewards: redeemed.length,
    rewardCost: redeemed.reduce((sum: number, row: any) => sum + Number(row.barber_fixed_earning ?? 10), 0),
    averageProgress: scopedAccounts.length ? scopedAccounts.reduce((sum: number, row: any) => sum + Number(row.eligible_visit_count ?? 0) % 6, 0) / scopedAccounts.length : 0,
    pendingRisk: available.length * 10,
    byBarber: group(redeemed, "barber_id", (row) => `${row.employees?.first_name ?? ""} ${row.employees?.last_name ?? ""}`.trim() || "Sin barbero"),
    byBranch: group(redeemed, "branch_id", (row) => row.branches?.name ?? "Sede"),
    frequentCustomers: scopedAccounts.sort((a: any, b: any) => Number(b.eligible_visit_count) - Number(a.eligible_visit_count)).slice(0, 10).map((row: any) => ({
      id: row.customer_id, name: row.customers?.full_name, phone: row.customers?.phone,
      visits: Number(row.eligible_visit_count), used: Number(row.redeemed_rewards), progress: Number(row.eligible_visit_count) % 6
    }))
  });
}
