import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const { data, error } = await context.admin
    .from("service_orders")
    .select("id,status,order_type,subtotal,total,total_paid,balance,discount_amount,paid_at,created_at,branches(id,name,address,phone),customers(full_name,phone),employees(id,first_name,last_name),service_order_items(id,item_type,name,description,quantity,unit_price,original_unit_price,discount_amount,discount_percent,subtotal,amount),payment_details(id,method,amount,reference)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Atencion no encontrada" }, { status: 404 });
  const row = data as any;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

  if (context.employee.role === "recepcion" && branch?.id !== context.employee.branchId) {
    return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  }
  if (context.employee.role === "barbero" && employee?.id !== context.employee.employeeId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  return NextResponse.json({ ticket: data });
}
