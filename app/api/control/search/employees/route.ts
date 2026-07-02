import { type NextRequest } from "next/server";
import { escapeLike, searchContext, searchResponse } from "../_utils";

export async function GET(request: NextRequest) {
  const result = await searchContext(request);
  if (result.response) return result.response;
  const term = escapeLike(result.q);
  let query = result.context.admin
    .from("employees")
    .select("id,first_name,last_name,nickname,role,branch_id,branches(name)")
    .eq("is_active", true)
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,nickname.ilike.%${term}%`)
    .order("first_name")
    .limit(20);
  if (result.branchId && result.branchId !== "all") query = query.eq("branch_id", result.branchId);
  const { data } = await query;
  return searchResponse((data ?? []).map((row: any) => {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return {
      id: row.id,
      label: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      subtitle: `${row.role ?? "empleado"} · ${branch?.name ?? "Sin sede"}`,
      metadata: { branchId: row.branch_id, role: row.role, nickname: row.nickname }
    };
  }));
}
