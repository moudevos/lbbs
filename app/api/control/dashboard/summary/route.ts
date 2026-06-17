import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function iso(date: Date) {
  return date.toISOString();
}

function sum(rows: any[], key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function paidOrders(rows: any[]) {
  return rows.filter((row) => row.status === "pagado");
}

function productsSold(rows: any[]) {
  return rows
    .flatMap((row) => row.service_order_items ?? [])
    .filter((item) => item.item_type === "product")
    .reduce((total, item) => total + Number(item.quantity ?? 0), 0);
}

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branch_id");
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const from = searchParams.get("from") ? new Date(`${searchParams.get("from")}T00:00:00`) : monthStart;
  const to = searchParams.get("to") ? new Date(`${searchParams.get("to")}T23:59:59`) : tomorrowStart;

  const scope = resolveBranchScope(context.employee, branchId);
  let query = context.admin
    .from("service_orders")
    .select("id,status,total,attended_at,branch_id,employee_id,employees(first_name,last_name),service_order_items(item_type,quantity),payment_details(method,amount)")
    .gte("attended_at", iso(from))
    .lte("attended_at", iso(to));

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else if (context.employee.role === "recepcion") {
    query = query.eq("branch_id", context.employee.branchId);
  } else {
    query = query.eq("employee_id", context.employee.employeeId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let productionQuery = context.admin
    .from("barber_production_entries")
    .select("entry_type,production_amount,barber_earning,counted_at,barber_id,sold_by_employee_id")
    .gte("counted_at", iso(monthStart))
    .lte("counted_at", iso(tomorrowStart))
    .is("voided_at", null);

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") productionQuery = productionQuery.eq("branch_id", scope.branchId);
  } else if (context.employee.role === "recepcion") {
    productionQuery = productionQuery.eq("branch_id", context.employee.branchId);
  } else {
    productionQuery = productionQuery.or(`barber_id.eq.${context.employee.employeeId},sold_by_employee_id.eq.${context.employee.employeeId}`);
  }

  const { data: productionRows } = await productionQuery;

  const rows = data ?? [];
  const paid = paidOrders(rows);
  const today = paid.filter((row) => new Date(row.attended_at) >= todayStart && new Date(row.attended_at) < tomorrowStart);
  const week = paid.filter((row) => new Date(row.attended_at) >= weekStart && new Date(row.attended_at) < tomorrowStart);
  const month = paid.filter((row) => new Date(row.attended_at) >= monthStart && new Date(row.attended_at) < tomorrowStart);

  const payments = today.flatMap((row) => row.payment_details ?? []);
  const paymentsByMethod = Array.from(payments.reduce((map, payment) => {
    map.set(payment.method, (map.get(payment.method) ?? 0) + Number(payment.amount ?? 0));
    return map;
  }, new Map<string, number>()), ([method, total]) => ({ method, total }));

  const weekByDay = new Map<string, number>();
  for (const row of week) {
    const key = new Date(row.attended_at).toISOString().slice(0, 10);
    weekByDay.set(key, (weekByDay.get(key) ?? 0) + Number(row.total ?? 0));
  }
  const bestDay = Array.from(weekByDay, ([date, total]) => ({ date, total })).sort((a, b) => b.total - a.total)[0] ?? null;

  const barberMap = new Map<string, { barber: string; serviceOrders: number; totalSales: number; averageTicket: number }>();
  for (const row of paid) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const name = `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() || "Sin barbero";
    const key = row.employee_id ?? "none";
    const current = barberMap.get(key) ?? { barber: name, serviceOrders: 0, totalSales: 0, averageTicket: 0 };
    current.serviceOrders += 1;
    current.totalSales += Number(row.total ?? 0);
    current.averageTicket = current.serviceOrders ? current.totalSales / current.serviceOrders : 0;
    barberMap.set(key, current);
  }

  const hourMap = new Map<string, number>();
  for (const row of paid) {
    const hour = `${String(new Date(row.attended_at).getHours()).padStart(2, "0")}:00`;
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  const maxHour = Math.max(...Array.from(hourMap.values()), 1);

  const production = productionRows ?? [];
  const productionToday = production.filter((row) => new Date(row.counted_at) >= todayStart && new Date(row.counted_at) < tomorrowStart);
  const productionWeek = production.filter((row) => new Date(row.counted_at) >= weekStart && new Date(row.counted_at) < tomorrowStart);
  const productionMonth = production.filter((row) => new Date(row.counted_at) >= monthStart && new Date(row.counted_at) < tomorrowStart);

  const productionRankingMap = new Map<string, { barberId: string; production: number; earning: number }>();
  const productCreditMap = new Map<string, { sellerId: string; credit: number }>();
  for (const row of productionMonth) {
    if (row.entry_type === "service") {
      const key = row.barber_id ?? "none";
      const current = productionRankingMap.get(key) ?? { barberId: key, production: 0, earning: 0 };
      current.production += Number(row.production_amount ?? 0);
      current.earning += Number(row.barber_earning ?? 0);
      productionRankingMap.set(key, current);
    }
    if (row.entry_type === "product_credit") {
      const key = row.sold_by_employee_id ?? row.barber_id ?? "none";
      const current = productCreditMap.get(key) ?? { sellerId: key, credit: 0 };
      current.credit += Number(row.production_amount ?? 0);
      productCreditMap.set(key, current);
    }
  }

  return NextResponse.json({
    today: {
      totalSales: sum(today, "total"),
      serviceOrders: today.length,
      productsSold: productsSold(today),
      paymentsByMethod
    },
    week: {
      totalSales: sum(week, "total"),
      serviceOrders: week.length,
      averageDailySales: sum(week, "total") / 7,
      bestDay
    },
    month: {
      totalSales: sum(month, "total"),
      serviceOrders: month.length,
      averageTicket: month.length ? sum(month, "total") / month.length : 0
    },
    production: {
      today: sum(productionToday, "production_amount"),
      week: sum(productionWeek, "production_amount"),
      month: sum(productionMonth, "production_amount"),
      earningsMonth: sum(productionMonth, "barber_earning"),
      ranking: Array.from(productionRankingMap.values()).sort((a, b) => b.production - a.production),
      productCredits: Array.from(productCreditMap.values()).sort((a, b) => b.credit - a.credit)
    },
    barberRanking: Array.from(barberMap.values()).sort((a, b) => b.totalSales - a.totalSales),
    peakHours: Array.from(hourMap, ([hour, count]) => ({ hour, count, percentage: Math.round((count / maxHour) * 100) })).sort((a, b) => b.count - a.count)
  });
}
