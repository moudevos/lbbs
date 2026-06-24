import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (!["admin", "recepcion"].includes(context.employee.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const branchId = params.get("branch_id");
  const q = params.get("q")?.trim();
  const marketing = params.get("marketing");
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("hotspot_visits")
    .select("id,branch_id,customer_id,customer_name,phone,accepted_terms,accepted_marketing,source,mac_address,ip_address,mikrotik_username,user_agent,visit_date,visited_at,metadata,branches(id,name,code),customers(id,created_at)")
    .order("visited_at", { ascending: false })
    .limit(500);

  if (context.employee.role === "admin" && scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  if (from) query = query.gte("visit_date", from);
  if (to) query = query.lte("visit_date", to);
  if (marketing === "yes") query = query.eq("accepted_marketing", true);
  if (marketing === "no") query = query.eq("accepted_marketing", false);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((row: any) => ({
    ...row,
    isNewCustomer: Boolean(row.metadata?.createdCustomer)
  }));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const month = today.slice(0, 7);
  const branchCount = new Map<string, { name: string; total: number }>();
  for (const row of rows) {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    const key = row.branch_id;
    const current = branchCount.get(key) ?? { name: branch?.name ?? "Sede", total: 0 };
    current.total += 1;
    branchCount.set(key, current);
  }
  const topBranch = [...branchCount.values()].sort((a, b) => b.total - a.total)[0] ?? null;

  return NextResponse.json({
    visits: rows,
    metrics: {
      today: rows.filter((row) => row.visit_date === today).length,
      month: rows.filter((row) => String(row.visit_date).startsWith(month)).length,
      newCustomers: rows.filter((row) => row.isNewCustomer).length,
      returningCustomers: rows.filter((row) => !row.isNewCustomer).length,
      marketingConsents: rows.filter((row) => row.accepted_marketing).length,
      topBranch
    }
  });
}
