import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const branchId = searchParams.get("branch_id");
  const barberId = searchParams.get("barber_id");
  const method = searchParams.get("method");
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("service_orders")
    .select("id,status,total,balance,created_at,branches(name),employees(id,first_name,last_name),customers(full_name),services(name),service_order_items(item_type,quantity,subtotal),payment_details(method,amount)")
    .gte("attended_at", `${date}T00:00:00`)
    .lte("attended_at", `${date}T23:59:59`)
    .order("attended_at", { ascending: false });

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else {
    query = query.eq("branch_id", context.employee.branchId);
  }
  if (barberId) query = query.eq("employee_id", barberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).filter((order: any) => {
    if (!method) return true;
    return (order.payment_details ?? []).some((payment: any) => payment.method === method);
  });
  const paidOrders = orders.filter((order: any) => order.status === "pagado");
  const totalSold = paidOrders.reduce((sum: number, order: any) => sum + Number(order.total ?? 0), 0);
  const pendingTotal = orders
    .filter((order: any) => order.status === "registrado")
    .reduce((sum: number, order: any) => sum + Number(order.balance ?? order.total ?? 0), 0);
  const productItems = paidOrders.flatMap((order: any) => (order.service_order_items ?? []).filter((item: any) => item.item_type === "product"));
  const serviceItems = paidOrders.flatMap((order: any) => (order.service_order_items ?? []).filter((item: any) => item.item_type === "service" || item.item_type === "custom_service"));
  const byMethod = new Map<string, number>();
  const byBarber = new Map<string, { name: string; total: number; count: number }>();

  for (const order of paidOrders as any[]) {
    for (const payment of order.payment_details ?? []) {
      byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + Number(payment.amount ?? 0));
    }
    const barberName = `${order.employees?.first_name ?? ""} ${order.employees?.last_name ?? ""}`.trim() || "Sin barbero";
    const current = byBarber.get(order.employees?.id ?? "none") ?? { name: barberName, total: 0, count: 0 };
    current.total += Number(order.total ?? 0);
    current.count += 1;
    byBarber.set(order.employees?.id ?? "none", current);
  }

  return NextResponse.json({
    date,
    totalSold,
    attentionCount: paidOrders.length,
    serviceCount: serviceItems.length,
    productsSold: productItems.reduce((sum: number, item: any) => sum + Number(item.quantity ?? 0), 0),
    productTotal: productItems.reduce((sum: number, item: any) => sum + Number(item.subtotal ?? 0), 0),
    pendingTotal,
    voidedCount: orders.filter((order: any) => order.status === "anulado").length,
    byMethod: Array.from(byMethod, ([paymentMethod, total]) => ({ method: paymentMethod, total })),
    byBarber: Array.from(byBarber.values()).sort((a, b) => b.total - a.total),
    tickets: orders
  });
}
