import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const { data, error } = await context.admin
    .from("service_orders")
    .select("id,status,origin,subtotal,total,total_paid,balance,discount_amount,observations,created_at,attended_at,paid_at,voided_at,reservation_id,reservations(id,starts_at,ends_at,status),branches(id,name),customers(id,full_name,phone,customer_reward_accounts(*)),employees(id,first_name,last_name),services(id,name,sku),service_order_items(id,item_type,name,description,quantity,unit_price,discount_amount,amount,subtotal,product_id,service_id,sold_by_employee_id,seller_credit_amount,counts_for_seller_credit,products(id,name,sku,counts_for_seller_credit,seller_credit_amount)),payment_details(id,method,amount,reference),customer_reward_redemptions(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Servicio no encontrado" }, { status: 404 });
  const row = data as any;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  if (context.employee.role === "recepcion" && branch?.id !== context.employee.branchId) {
    return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  }
  if (context.employee.role === "barbero" && employee?.id !== context.employee.employeeId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  return NextResponse.json({ serviceOrder: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (body.observations !== undefined) patch.observations = body.observations;
  if (body.total !== undefined) patch.total = Number(body.total);

  const { error } = await context.admin.from("service_orders").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
