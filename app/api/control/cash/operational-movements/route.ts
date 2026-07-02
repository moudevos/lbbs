import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { peruDayRange } from "@/lib/datetime/peru-time";
import { summarizeOperationalMovements } from "@/lib/cash/operational-movements";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const date = request.nextUrl.searchParams.get("date");
  const branchParam = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId") ?? "all";
  const branchId = context.employee.role === "admin" ? branchParam : context.employee.branchId;
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const range = date ? peruDayRange(date) : { from: request.nextUrl.searchParams.get("from"), to: request.nextUrl.searchParams.get("to") };

  let query = context.admin
    .from("cash_operational_movements")
    .select(`
      id,
      branch_id,
      movement_type,
      direction,
      amount,
      payment_method,
      status,
      description,
      responsible_employee_id,
      created_by,
      voided_by,
      voided_at,
      void_reason,
      related_product_id,
      related_stock_movement_id,
      related_cash_closure_id,
      metadata,
      occurred_at,
      created_at,
      branches(name),
      products:products(name, sku, category),
      responsible:employees(first_name, last_name, role)
    `)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  if (status !== "all") query = query.eq("status", status);
  if (range.from) query = query.gte("occurred_at", range.from);
  if (range.to) query = query.lte("occurred_at", range.to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const movements = (data ?? []).map((row: any) => {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const responsible = Array.isArray(row.responsible) ? row.responsible[0] : row.responsible;
    return {
      ...row,
      branchName: branch?.name ?? "Sin sede",
      productName: product?.name ?? "Producto",
      productSku: product?.sku ?? "",
      productCategory: product?.category ?? "",
      responsibleName: `${responsible?.first_name ?? ""} ${responsible?.last_name ?? ""}`.trim(),
      quantity: Number(row.metadata?.quantity ?? 0),
      unitCost: Number(row.metadata?.unit_cost ?? 0)
    };
  });

  const summary = summarizeOperationalMovements(movements.filter((row: any) => row.status === "active"));
  return NextResponse.json({ ok: true, movements, summary });
}
