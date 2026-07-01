import { type NextRequest } from "next/server";
import { escapeLike, searchContext, searchResponse } from "../_utils";

export async function GET(request: NextRequest) {
  const result = await searchContext(request);
  if (result.response) return result.response;
  const term = escapeLike(result.q);
  let query = result.context.admin
    .from("services")
    .select("id,name,description,price,duration_minutes,branch_id")
    .eq("is_active", true)
    .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    .order("name")
    .limit(20);
  if (result.branchId && result.branchId !== "all") query = query.or(`branch_id.is.null,branch_id.eq.${result.branchId}`);
  const { data } = await query;
  return searchResponse((data ?? []).map((row: any) => ({
    id: row.id,
    label: row.name,
    subtitle: `${row.duration_minutes ?? 0} min · ${row.price == null ? "Consultar" : `S/ ${Number(row.price).toFixed(2)}`}`,
    metadata: { price: row.price, durationMinutes: row.duration_minutes, branchId: row.branch_id }
  })));
}
