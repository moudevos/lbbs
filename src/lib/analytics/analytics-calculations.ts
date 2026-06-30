import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentEmployee } from "@/lib/auth/types";
import { parsePeruDateTime, toPeruDate } from "@/lib/datetime/peru-time";
import { calculateServiceProduction, money } from "@/lib/production/calculate-barber-production";

type AdminClient = SupabaseClient<any, "public", any>;

export type AnalyticsFilters = {
  from: string;
  to: string;
  branchId: string;
  barberId: string;
  serviceId: string;
  category: string;
  paymentMethod: string;
  status: "pagado" | "anulado" | "all";
  search: string;
};

export type AnalyticsDataset = {
  filters: AnalyticsFilters;
  orders: any[];
};

const paymentKeys = ["cash", "qr", "card", "transfer", "mixed", "other"] as const;
const validServiceTypes = ["service", "custom_service", "manual_extra"];

export function normalizeAnalyticsFilters(searchParams: URLSearchParams, employee: CurrentEmployee): AnalyticsFilters {
  const today = toPeruDate();
  const monthStart = `${today.slice(0, 8)}01`;
  const requestedBranch = searchParams.get("branch_id") || searchParams.get("branchId") || "all";
  const branchId = employee.role === "admin" ? requestedBranch : employee.branchId ?? "";
  const status = searchParams.get("status");
  return {
    from: searchParams.get("from") || searchParams.get("date") || monthStart,
    to: searchParams.get("to") || searchParams.get("date") || today,
    branchId: branchId || "all",
    barberId: searchParams.get("barber_id") || searchParams.get("barberId") || "",
    serviceId: searchParams.get("service_id") || searchParams.get("serviceId") || "",
    category: searchParams.get("category") || "",
    paymentMethod: searchParams.get("payment_method") || searchParams.get("method") || "",
    status: status === "anulado" || status === "all" ? status : "pagado",
    search: (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase()
  };
}

export async function getAnalyticsDataset(admin: AdminClient, filters: AnalyticsFilters): Promise<{ data?: AnalyticsDataset; error?: string }> {
  const fromIso = parsePeruDateTime(filters.from, "00:00").toISOString();
  const toIso = parsePeruDateTime(filters.to, "23:59:59").toISOString();
  let query = admin
    .from("service_orders")
    .select(`
      id,status,origin,total,subtotal,total_paid,balance,discount_amount,service_date,created_at,attended_at,paid_at,voided_at,branch_id,employee_id,customer_id,
      branches(id,name),
      customers(id,full_name,phone,created_at),
      employees(id,first_name,last_name),
      services(id,name,duration_minutes,price),
      service_order_items(
        id,item_type,name,description,quantity,unit_price,amount,subtotal,discount_amount,service_id,product_id,barber_id,sold_by_employee_id,seller_credit_amount,counts_for_seller_credit,
        services(id,name,duration_minutes),
        products(id,name,category,cost,cost_price,sale_price,counts_for_seller_credit,seller_credit_amount,product_branch_stock(branch_id,stock_current))
      ),
      payment_details(id,method,amount,reference,created_at)
    `)
    .gte("attended_at", fromIso)
    .lte("attended_at", toIso)
    .order("attended_at", { ascending: false });

  if (filters.branchId && filters.branchId !== "all") query = query.eq("branch_id", filters.branchId);
  if (filters.barberId) query = query.eq("employee_id", filters.barberId);
  if (filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const filtered = (data ?? []).filter((order: any) => {
    const items = order.service_order_items ?? [];
    if (filters.serviceId && !items.some((item: any) => item.service_id === filters.serviceId)) return false;
    if (filters.paymentMethod && !(order.payment_details ?? []).some((payment: any) => payment.method === filters.paymentMethod)) return false;
    if (filters.category && !matchesCategory(order, filters.category)) return false;
    if (filters.search) {
      const customer = first(order.customers);
      const haystack = `${customer?.full_name ?? ""} ${customer?.phone ?? ""}`.toLowerCase();
      if (!haystack.includes(filters.search)) return false;
    }
    return true;
  });

  return { data: { filters, orders: filtered } };
}

export function calculateSummary(dataset: AnalyticsDataset) {
  const orders = dataset.orders;
  const paid = validOrders(orders);
  const paidItems = paid.flatMap((order) => orderItems(order).map((item: any) => ({ order, item })));
  const services = paidItems.filter(({ item }) => validServiceTypes.includes(String(item.item_type)));
  const products = paidItems.filter(({ item }) => ["product", "snack"].includes(String(item.item_type)));
  const snacks = products.filter(({ item }) => productCategory(item) === "snack");
  const barberProducts = products.filter(({ item }) => productCategory(item) !== "snack");
  const payments = paid.flatMap((order) => paymentDetails(order).map((payment: any) => ({ order, payment })));
  const paymentMethods = emptyPaymentMethods();

  for (const { payment } of payments) {
    const key = paymentBucket(payment.method);
    paymentMethods[key] += amount(payment.amount);
  }

  const totalCollected = round(payments.reduce((sum, { payment }) => sum + amount(payment.amount), 0));
  const totalSold = round(paid.reduce((sum, order) => sum + amount(order.total), 0));
  const servicesTotal = round(services.reduce((sum, { item }) => sum + itemAmount(item), 0));
  const productsTotal = round(barberProducts.reduce((sum, { item }) => sum + itemAmount(item), 0));
  const snacksTotal = round(snacks.reduce((sum, { item }) => sum + itemAmount(item), 0));
  const estimatedBarberProduction = round(services.reduce((sum, { item }) => sum + validProduction(item).productionAmount, 0));
  const estimatedBarberPay = round(services.reduce((sum, { item }) => sum + validProduction(item).barberEarning, 0));
  const estimatedProductCost = round(products.reduce((sum, { item }) => sum + productCost(item), 0));
  const missingProductCosts = products.some(({ item }) => productUnitCost(item) <= 0);
  const customerIds = new Set(paid.map((order) => first(order.customers)).filter((customer: any) => customer?.phone && !isGenericCustomer(customer)).map((customer: any) => customer.id));
  const voided = orders.filter((order) => order.status === "anulado");

  return {
    totalSold,
    totalCollected,
    servicesTotal,
    productsTotal,
    snacksTotal,
    voidedTotal: round(voided.reduce((sum, order) => sum + amount(order.total), 0)),
    voidedCount: voided.length,
    attentionCount: paid.length,
    customersServed: customerIds.size,
    averageTicket: paid.length ? round(totalSold / paid.length) : 0,
    estimatedBarberProduction,
    estimatedBarberPay,
    estimatedProductCost,
    operationalRemainderBeforeExpenses: round(totalCollected - estimatedBarberPay - estimatedProductCost),
    expectedCash: round(paymentMethods.cash),
    countedCash: null,
    cashDifference: null,
    missingProductCosts,
    paymentMethods
  };
}

export function groupSalesByDay(dataset: AnalyticsDataset) {
  const map = new Map<string, any>();
  for (const order of dataset.orders) {
    const date = toPeruDate(order.attended_at ?? order.created_at);
    const row = map.get(date) ?? { date, branch: "Todas", totalSold: 0, totalCollected: 0, services: 0, products: 0, snacks: 0, voided: 0, averageTicket: 0, attentionCount: 0 };
    if (order.status === "anulado") row.voided += amount(order.total);
    if (order.status === "pagado") {
      row.totalSold += amount(order.total);
      row.totalCollected += paymentDetails(order).reduce((sum: number, payment: any) => sum + amount(payment.amount), 0);
      row.attentionCount += 1;
      for (const item of orderItems(order)) {
        if (validServiceTypes.includes(String(item.item_type))) row.services += itemAmount(item);
        if (["product", "snack"].includes(String(item.item_type))) {
          if (productCategory(item) === "snack") row.snacks += itemAmount(item);
          else row.products += itemAmount(item);
        }
      }
    }
    map.set(date, row);
  }
  return Array.from(map.values()).map((row) => ({ ...roundObject(row), averageTicket: row.attentionCount ? round(row.totalSold / row.attentionCount) : 0 })).sort((a, b) => a.date.localeCompare(b.date));
}

export function groupSalesByPaymentMethod(dataset: AnalyticsDataset) {
  const map = new Map<string, number>();
  for (const order of validOrders(dataset.orders)) {
    for (const payment of paymentDetails(order)) map.set(payment.method, (map.get(payment.method) ?? 0) + amount(payment.amount));
  }
  return Array.from(map, ([method, total]) => ({ method, total: round(total) })).sort((a, b) => b.total - a.total);
}

export function groupServices(dataset: AnalyticsDataset) {
  const map = new Map<string, any>();
  let total = 0;
  for (const order of validOrders(dataset.orders)) {
    for (const item of orderItems(order).filter((row: any) => validServiceTypes.includes(String(row.item_type)))) {
      const service = first(item.services);
      const key = item.service_id ?? item.name ?? "custom";
      const current = map.get(key) ?? { service: service?.name ?? item.name ?? "Servicio personalizado", quantity: 0, revenue: 0, durationTotal: 0, branches: new Map(), barbers: new Map() };
      const quantity = amount(item.quantity || 1);
      current.quantity += quantity;
      current.revenue += itemAmount(item);
      current.durationTotal += amount(service?.duration_minutes ?? first(order.services)?.duration_minutes ?? 0) * quantity;
      incrementNameMap(current.branches, first(order.branches)?.name ?? "Sin sede", quantity);
      incrementNameMap(current.barbers, barberName(first(order.employees)), quantity);
      total += quantity;
      map.set(key, current);
    }
  }
  return Array.from(map.values()).map((row) => ({
    service: row.service,
    quantity: round(row.quantity),
    revenue: round(row.revenue),
    averageTicket: row.quantity ? round(row.revenue / row.quantity) : 0,
    averageDuration: row.quantity ? round(row.durationTotal / row.quantity) : 0,
    mainBranch: topFromMap(row.branches),
    topBarber: topFromMap(row.barbers),
    percent: total ? round((row.quantity / total) * 100) : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

export function groupBarbers(dataset: AnalyticsDataset) {
  const map = new Map<string, any>();
  let totalProduction = 0;
  for (const order of dataset.orders) {
    const barber = first(order.employees);
    const id = barber?.id ?? "none";
    const row = map.get(id) ?? { barber: barberName(barber), attentions: 0, services: 0, grossProduction: 0, validProduction: 0, estimatedPay: 0, productsAssociated: 0, voids: 0 };
    if (order.status === "anulado") row.voids += 1;
    if (order.status === "pagado") {
      row.attentions += 1;
      for (const item of orderItems(order)) {
        if (validServiceTypes.includes(String(item.item_type))) {
          const prod = validProduction(item);
          row.services += amount(item.quantity || 1);
          row.grossProduction += itemAmount(item);
          row.validProduction += prod.productionAmount;
          row.estimatedPay += prod.barberEarning;
          totalProduction += prod.productionAmount;
        }
        if (["product", "snack"].includes(String(item.item_type))) row.productsAssociated += itemAmount(item);
      }
    }
    map.set(id, row);
  }
  return Array.from(map.values()).map((row) => ({
    ...roundObject(row),
    averageTicket: row.attentions ? round(row.grossProduction / row.attentions) : 0,
    productionShare: totalProduction ? round((row.validProduction / totalProduction) * 100) : 0
  })).sort((a, b) => b.validProduction - a.validProduction);
}

export function groupProducts(dataset: AnalyticsDataset) {
  const map = new Map<string, any>();
  for (const order of dataset.orders) {
    for (const item of orderItems(order).filter((row: any) => ["product", "snack", "courtesy"].includes(String(row.item_type)))) {
      const product = first(item.products);
      const key = item.product_id ?? item.name;
      const row = map.get(key) ?? { product: product?.name ?? item.name ?? "Producto", category: product?.category ?? item.item_type, quantitySold: 0, courtesyQuantity: 0, revenue: 0, estimatedCost: 0, stock: stockCurrent(product, order.branch_id), branch: first(order.branches)?.name ?? "Sede" };
      const qty = amount(item.quantity || 1);
      if (order.status === "pagado" && item.item_type !== "courtesy") {
        row.quantitySold += qty;
        row.revenue += itemAmount(item);
        row.estimatedCost += productUnitCost(item) * qty;
      } else {
        row.courtesyQuantity += qty;
      }
      map.set(key, row);
    }
  }
  return Array.from(map.values()).map((row) => ({ ...roundObject(row), estimatedMargin: round(row.revenue - row.estimatedCost) })).sort((a, b) => b.revenue - a.revenue);
}

export function groupCustomers(dataset: AnalyticsDataset) {
  const map = new Map<string, any>();
  let withWhatsapp = 0;
  for (const order of validOrders(dataset.orders)) {
    const customer = first(order.customers);
    if (!customer || isGenericCustomer(customer)) continue;
    const row = map.get(customer.id) ?? { customer: customer.full_name, phone: customer.phone, visits: 0, totalConsumption: 0, lastVisit: "", branches: new Map(), origin: order.origin ?? "atencion" };
    row.visits += 1;
    row.totalConsumption += amount(order.total);
    row.lastVisit = maxDate(row.lastVisit, order.attended_at ?? order.created_at);
    incrementNameMap(row.branches, first(order.branches)?.name ?? "Sin sede", 1);
    map.set(customer.id, row);
  }
  for (const row of map.values()) if ((row.phone ?? "").replace(/\D/g, "").length >= 9) withWhatsapp += 1;
  const rows = Array.from(map.values()).map((row) => ({
    customer: row.customer,
    phone: row.phone,
    visits: row.visits,
    totalConsumption: round(row.totalConsumption),
    lastVisit: row.lastVisit,
    frequentBranch: topFromMap(row.branches),
    origin: row.origin
  })).sort((a, b) => b.totalConsumption - a.totalConsumption);
  return {
    customersServed: rows.length,
    newCustomers: rows.filter((row) => row.visits === 1).length,
    recurrentCustomers: rows.filter((row) => row.visits > 1).length,
    customersWithWhatsapp: withWhatsapp,
    rows
  };
}

export function groupPeakHours(dataset: AnalyticsDataset) {
  const byHour = new Map<string, any>();
  const byDay = new Map<string, any>();
  for (const order of validOrders(dataset.orders)) {
    const date = new Date(order.attended_at ?? order.created_at);
    const hour = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", hour12: false, timeZone: "America/Lima" }).format(date);
    const weekday = new Intl.DateTimeFormat("es-PE", { weekday: "long", timeZone: "America/Lima" }).format(date);
    addPeak(byHour, `${hour}:00`, order);
    addPeak(byDay, weekday, order);
  }
  return {
    byHour: Array.from(byHour.values()).sort((a, b) => b.attentions - a.attentions),
    byDay: Array.from(byDay.values()).sort((a, b) => b.attentions - a.attentions)
  };
}

export function generateInsights(dataset: AnalyticsDataset) {
  const summary = calculateSummary(dataset);
  if (summary.attentionCount === 0) return ["Aun no hay datos suficientes para generar hallazgos."];
  const sales = groupSalesByDay(dataset);
  const methods = groupSalesByPaymentMethod(dataset);
  const services = groupServices(dataset);
  const barbers = groupBarbers(dataset);
  const peaks = groupPeakHours(dataset);
  return [
    sales[0] ? `El dia con mayor venta fue ${sales.slice().sort((a, b) => b.totalSold - a.totalSold)[0].date}.` : null,
    methods[0] ? `El metodo de pago mas usado fue ${methods[0].method}.` : null,
    services[0] ? `El servicio con mayor ingreso fue ${services[0].service}.` : null,
    barbers[0] ? `El barbero con mayor produccion fue ${barbers[0].barber}.` : null,
    peaks.byHour[0] ? `La hora con mayor afluencia fue ${peaks.byHour[0].label}.` : null,
    `El ticket promedio fue S/ ${summary.averageTicket.toFixed(2)}.`
  ].filter(Boolean) as string[];
}

export function movements(dataset: AnalyticsDataset) {
  return dataset.orders.map((order) => ({
    id: order.id,
    time: order.attended_at ?? order.created_at,
    customer: first(order.customers)?.full_name ?? "Cliente",
    phone: first(order.customers)?.phone ?? "",
    type: order.origin ?? "atencion",
    category: orderCategory(order),
    amount: amount(order.total),
    paymentMethod: paymentDetails(order).map((payment: any) => payment.method).join(" + ") || "Sin pago",
    status: order.status,
    barber: barberName(first(order.employees)),
    branch: first(order.branches)?.name ?? "Sede"
  }));
}

export function buildAnalyticsPayload(dataset: AnalyticsDataset) {
  return {
    ok: true,
    filters: dataset.filters,
    summary: calculateSummary(dataset),
    salesByDay: groupSalesByDay(dataset),
    paymentMethods: groupSalesByPaymentMethod(dataset),
    services: groupServices(dataset),
    barbers: groupBarbers(dataset),
    products: groupProducts(dataset),
    customers: groupCustomers(dataset),
    peakHours: groupPeakHours(dataset),
    insights: generateInsights(dataset),
    movements: movements(dataset)
  };
}

function validOrders(orders: any[]) {
  return orders.filter((order) => order.status === "pagado");
}

function validProduction(item: any) {
  if (["courtesy", "reward_discount"].includes(String(item.item_type))) return { productionAmount: 0, barberEarning: 0 };
  const name = `${item.name ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (name.includes("empleado") || name.includes("50%")) return { productionAmount: 0, barberEarning: 0 };
  return calculateServiceProduction({ grossAmount: itemAmount(item), percentage: Number(item.production_percentage ?? item.applied_percentage ?? 0) });
}

function paymentDetails(order: any) {
  return order.payment_details ?? [];
}

function orderItems(order: any) {
  return order.service_order_items ?? [];
}

function itemAmount(item: any) {
  return amount(item.subtotal ?? item.amount ?? item.unit_price);
}

function amount(value: unknown) {
  return money(value);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function roundObject<T extends Record<string, any>>(input: T) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "number" ? round(value) : value])) as T;
}

function emptyPaymentMethods() {
  return Object.fromEntries(paymentKeys.map((key) => [key, 0])) as Record<(typeof paymentKeys)[number], number>;
}

function paymentBucket(method?: string | null): keyof ReturnType<typeof emptyPaymentMethods> {
  if (method === "efectivo") return "cash";
  if (method === "yape" || method === "plin" || method === "qr") return "qr";
  if (method === "tarjeta") return "card";
  if (method === "transferencia") return "transfer";
  if (method === "mixto") return "mixed";
  return "other";
}

function productCategory(item: any) {
  const product = first(item.products);
  return item.item_type === "snack" ? "snack" : product?.category ?? item.category ?? "barber_product";
}

function productUnitCost(item: any) {
  const product = first(item.products);
  return amount(product?.cost_price ?? product?.cost ?? 0);
}

function productCost(item: any) {
  return productUnitCost(item) * amount(item.quantity || 1);
}

function stockCurrent(product: any, branchId: string) {
  const stock = (product?.product_branch_stock ?? []).find((row: any) => row.branch_id === branchId) ?? first(product?.product_branch_stock);
  return Number(stock?.stock_current ?? 0);
}

function matchesCategory(order: any, category: string) {
  if (category === "service") return orderItems(order).some((item: any) => validServiceTypes.includes(String(item.item_type)));
  if (category === "snack") return orderItems(order).some((item: any) => productCategory(item) === "snack");
  if (category === "product") return orderItems(order).some((item: any) => ["product", "snack"].includes(String(item.item_type)) && productCategory(item) !== "snack");
  return true;
}

function orderCategory(order: any) {
  const items = orderItems(order);
  if (items.some((item: any) => validServiceTypes.includes(String(item.item_type)))) return "servicio";
  if (items.some((item: any) => productCategory(item) === "snack")) return "snack";
  if (items.some((item: any) => ["product", "snack"].includes(String(item.item_type)))) return "producto";
  return "otro";
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function barberName(barber: any) {
  return barber ? `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim() || "Sin barbero" : "Sin barbero";
}

function incrementNameMap(map: Map<string, number>, key: string, amountToAdd: number) {
  map.set(key, (map.get(key) ?? 0) + amountToAdd);
}

function topFromMap(map: Map<string, number>) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function maxDate(current: string, next: string) {
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function isGenericCustomer(customer: any) {
  const phone = String(customer?.phone ?? "").replace(/\D/g, "");
  return phone === "000000000" || phone === "";
}

function addPeak(map: Map<string, any>, label: string, order: any) {
  const row = map.get(label) ?? { label, attentions: 0, sales: 0 };
  row.attentions += 1;
  row.sales += amount(order.total);
  map.set(label, row);
}
