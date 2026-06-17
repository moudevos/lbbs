import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(_request: Request, { params }: { params: { customerId: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const [{ data: customer, error }, { data: ledger }, { data: redemptions }] = await Promise.all([
    context.admin.from("customers").select("id,full_name,phone,branch_id,branches(name),customer_visit_stats(*),customer_reward_accounts(*)").eq("id", params.customerId).maybeSingle(),
    context.admin.from("customer_reward_ledger").select("*").eq("customer_id", params.customerId).order("created_at", { ascending: false }).limit(50),
    context.admin.from("customer_reward_redemptions").select("*").eq("customer_id", params.customerId).order("redeemed_at", { ascending: false }).limit(50)
  ]);

  if (error || !customer) return NextResponse.json({ error: error?.message ?? "Cliente no encontrado" }, { status: 404 });
  if (context.employee.role === "recepcion" && customer.branch_id !== context.employee.branchId) return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  return NextResponse.json({ customer, ledger: ledger ?? [], redemptions: redemptions ?? [] });
}
