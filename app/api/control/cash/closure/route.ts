import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const requestedBranch = request.nextUrl.searchParams.get("branch_id");
  const branchId = context.employee.role === "admin" ? requestedBranch : context.employee.branchId;
  if (!branchId || branchId === "all") return NextResponse.json({ closure: null });
  const { data, error } = await context.admin.from("cash_closures").select("*").eq("branch_id", branchId).eq("closure_date", date).maybeSingle();
  if (error && error.code !== "42P01") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ closure: data ?? null });
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const branchId = context.employee.role === "admin" ? body.branchId : context.employee.branchId;
  const date = String(body.date ?? new Date().toISOString().slice(0, 10));
  if (!branchId || branchId === "all") return NextResponse.json({ error: "Selecciona una sede" }, { status: 400 });

  const { data: orders, error } = await context.admin
    .from("service_orders")
    .select("id,status,total,payment_details(method,amount)")
    .eq("branch_id", branchId).eq("service_date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const pending = (orders ?? []).filter((item: any) => ["registrado", "pendiente_pago"].includes(item.status));
  if (pending.length) {
    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
      eventType: "status_change", tableName: "cash_closures",
      newData: { event: "closure_blocked_by_pending_orders", branch_id: branchId, closure_date: date, pending_ids: pending.map((item: any) => item.id) }
    });
    return NextResponse.json({ error: `No se puede cerrar: hay ${pending.length} atencion(es) pendiente(s) de pago.` }, { status: 409 });
  }

  const paid = (orders ?? []).filter((item: any) => item.status === "pagado");
  const voided = (orders ?? []).filter((item: any) => item.status === "anulado");
  const totals: Record<string, number> = {};
  for (const order of paid as any[]) {
    for (const payment of order.payment_details ?? []) totals[payment.method] = (totals[payment.method] ?? 0) + Number(payment.amount ?? 0);
  }
  const totalPaid = paid.reduce((sum: number, item: any) => sum + Number(item.total ?? 0), 0);
  const expectedByMethod = bucketPaymentTotals(totals);
  const expectedCash = expectedByMethod.cash;
  const countedByMethod = normalizeCountedByMethod(body.countedByMethod, Number(body.countedCash ?? 0));
  const countedTotal = sumCounted(countedByMethod);
  const expectedTotal = sumCounted(expectedByMethod);
  const countedCash = Number(body.countedCash ?? 0);
  const payload = {
    branch_id: branchId, closure_date: date, status: "closed", closed_at: new Date().toISOString(),
    closed_by: context.employee.employeeId, expected_cash: expectedCash, counted_cash: countedCash,
    difference: countedTotal - expectedTotal, total_paid: totalPaid,
    total_voided: voided.reduce((sum: number, item: any) => sum + Number(item.total ?? 0), 0),
    total_by_method: { raw: totals, expected: expectedByMethod, counted: countedByMethod }, notes: body.notes || null
  };
  const { data: closure, error: closeError } = await context.admin
    .from("cash_closures").upsert(payload, { onConflict: "branch_id,closure_date" }).select("id").single();
  if (closeError || !closure) return NextResponse.json({ error: closeError?.message ?? "No se pudo cerrar caja" }, { status: 500 });

  await context.admin.from("cash_closure_items").delete().eq("cash_closure_id", closure.id);
  const snapshots = (orders ?? []).flatMap((order: any) => {
    const payments = order.payment_details?.length ? order.payment_details : [{ method: null, amount: order.total }];
    return payments.map((payment: any) => ({
      cash_closure_id: closure.id, service_order_id: order.id, amount: Number(payment.amount ?? 0),
      status: order.status, payment_method: payment.method, included_in_total: order.status === "pagado"
    }));
  });
  if (snapshots.length) await context.admin.from("cash_closure_items").insert(snapshots);
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "status_change", tableName: "cash_closures", recordId: closure.id, newData: { event: "cash_closed", ...payload }
  });
  return NextResponse.json({ ok: true, closureId: closure.id });
}

function bucketPaymentTotals(totals: Record<string, number>) {
  return {
    cash: round(totals.efectivo ?? 0),
    card: round(totals.tarjeta ?? 0),
    qr: round((totals.yape ?? 0) + (totals.plin ?? 0) + (totals.qr ?? 0)),
    transfer: round(totals.transferencia ?? 0)
  };
}

function normalizeCountedByMethod(input: any, fallbackCash: number) {
  return {
    cash: round(input?.cash ?? fallbackCash),
    card: round(input?.card ?? 0),
    qr: round(input?.qr ?? 0),
    transfer: round(input?.transfer ?? 0)
  };
}

function sumCounted(input: Record<string, number>) {
  return round(Object.values(input).reduce((sum, value) => sum + Number(value ?? 0), 0));
}

function round(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
