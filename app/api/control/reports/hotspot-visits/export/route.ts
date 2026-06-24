import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET(request: Request) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (!["admin", "recepcion"].includes(context.employee.role)) return new Response("Sin permiso", { status: 403 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const branchId = params.get("branch_id");
  const q = params.get("q")?.trim();
  const marketing = params.get("marketing");
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("hotspot_visits")
    .select("customer_name,phone,accepted_terms,accepted_marketing,mac_address,ip_address,visited_at,metadata,branches(name)")
    .order("visited_at", { ascending: false });
  if (context.employee.role === "admin" && scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  if (from) query = query.gte("visit_date", from);
  if (to) query = query.lte("visit_date", to);
  if (marketing === "yes") query = query.eq("accepted_marketing", true);
  if (marketing === "no") query = query.eq("accepted_marketing", false);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  return xlsxResponse("visitas-hotspot.xlsx", "Visitas hotspot", (data ?? []).map((row: any) => {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return {
      fecha: row.visited_at ? new Date(row.visited_at).toLocaleString("es-PE") : "",
      sede: branch?.name ?? "",
      nombre: row.customer_name,
      celular: row.phone,
      nuevo_recurrente: row.metadata?.createdCustomer ? "nuevo" : "recurrente",
      terminos: row.accepted_terms ? "si" : "no",
      publicidad: row.accepted_marketing ? "si" : "no",
      ip: row.ip_address ?? "",
      mac: row.mac_address ?? ""
    };
  }));
}
