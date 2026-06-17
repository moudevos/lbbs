import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { redeemCustomerReward } from "@/lib/rewards/server";

export async function POST(request: NextRequest, { params }: { params: { customerId: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const rewardType = body.rewardType as "classic_cut" | "voucher_30";
  if (!["classic_cut", "voucher_30"].includes(rewardType)) return NextResponse.json({ error: "Tipo de reward invalido" }, { status: 400 });

  const { data: customer } = await context.admin.from("customers").select("id,branch_id").eq("id", params.customerId).maybeSingle();
  if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  if (context.employee.role === "recepcion" && customer.branch_id !== context.employee.branchId) return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });

  const result = await redeemCustomerReward({
    admin: context.admin,
    customerId: params.customerId,
    branchId: customer.branch_id,
    rewardType,
    redeemedBy: context.employee.userId
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "customer_reward_redemptions",
    recordId: result.redemptionId,
    newData: { customer_id: params.customerId, reward_type: rewardType, amount_value: result.amountValue }
  });

  return NextResponse.json(result);
}
