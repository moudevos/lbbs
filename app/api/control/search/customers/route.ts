import { type NextRequest } from "next/server";
import { escapeLike, searchContext, searchResponse } from "../_utils";

export async function GET(request: NextRequest) {
  const result = await searchContext(request);
  if (result.response) return result.response;
  const term = escapeLike(result.q);
  const { data } = await result.context.admin
    .from("customers")
    .select("id,full_name,phone,notes")
    .eq("is_active", true)
    .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
    .order("full_name")
    .limit(20);
  return searchResponse((data ?? []).map((row: any) => ({
    id: row.id,
    label: row.full_name,
    subtitle: `${row.phone ?? "Sin celular"}${row.notes ? ` · ${row.notes}` : ""}`,
    metadata: { phone: row.phone, fullName: row.full_name }
  })));
}
