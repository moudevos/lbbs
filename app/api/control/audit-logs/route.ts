import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const { searchParams } = request.nextUrl;
  const scope = resolveBranchScope(context.employee, searchParams.get("branch_id"));
  const date = searchParams.get("date");
  const eventType = searchParams.get("event_type");
  const tableName = searchParams.get("table_name");

  let query = context.admin
    .from("audit_logs")
    .select("id,created_at,actor_user_id,actor_role,actor_branch_id,event_type,table_name,record_id,new_data,previous_data")
    .order("created_at", { ascending: false })
    .limit(100);

  if (scope.mode === "branch") query = query.eq("actor_branch_id", scope.branchId);
  if (date) {
    query = query.gte("created_at", `${date}T00:00:00`).lte("created_at", `${date}T23:59:59`);
  }
  if (eventType) query = query.eq("event_type", eventType);
  if (tableName) query = query.eq("table_name", tableName);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
