import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;
  const branchId = searchParams.get("branch_id");
  const employeeId = searchParams.get("employee_id");
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("service_orders")
    .select("id,status,branch_id,employee_id,total,service_date,employees(id,first_name,last_name),service_order_items(item_type,quantity,subtotal,barber_id,sold_by_employee_id,seller_credit_amount,counts_for_seller_credit,products(category,counts_for_seller_credit,seller_credit_amount))")
    .gte("service_date", from)
    .lte("service_date", to)
    .neq("status", "anulado");

  if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = new Map<string, { employeeId: string; name: string; servicesCount: number; netProduction: number; barberProductSales: number; productCredits: number }>();
  for (const order of data ?? []) {
    const employee = Array.isArray(order.employees) ? order.employees[0] : order.employees;
    const key = order.employee_id ?? "none";
    const current = rows.get(key) ?? {
      employeeId: key,
      name: `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() || "Sin empleado",
      servicesCount: 0,
      netProduction: 0,
      barberProductSales: 0,
      productCredits: 0
    };

    for (const item of order.service_order_items ?? []) {
      if (item.item_type === "service" || item.item_type === "custom_service" || item.item_type === "manual_extra") {
        const subtotal = Number(item.subtotal ?? 0);
        current.servicesCount += item.item_type === "service" ? 1 : 0;
        current.netProduction += Math.max(subtotal - Math.min(subtotal > 60 ? 10 : 2, subtotal), 0);
      }
      if (item.item_type === "product") {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        const isBarberProduct = product?.category === "barber_product" || Boolean(item.counts_for_seller_credit ?? product?.counts_for_seller_credit);
        if (isBarberProduct) {
          current.barberProductSales += Number(item.subtotal ?? 0);
          current.productCredits += Number(item.quantity ?? 0) * Number(item.seller_credit_amount ?? product?.seller_credit_amount ?? 0);
        }
      }
    }
    rows.set(key, current);
  }

  return NextResponse.json({ rankings: Array.from(rows.values()).sort((a, b) => b.servicesCount - a.servicesCount) });
}
