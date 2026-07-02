import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 20), 1), 50);
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("product_stock_movements")
    .select("id,branch_id,movement_type,movement_kind,quantity,quantity_delta,previous_stock,new_stock,reason,reference,metadata,created_at,branches(name)")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else if (context.employee.branchId) {
    query = query.eq("branch_id", context.employee.branchId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ movements: data ?? [] });
}
