import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { applyRewardToServiceOrder } from "@/lib/service-orders/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const result = await applyRewardToServiceOrder({
    admin: context.admin,
    serviceOrderId: params.id,
    rewardType: body.rewardType,
    actorUserId: context.employee.userId
  });

  if ("error" in result && result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "customer_reward_redemptions",
    recordId: params.id,
    newData: result
  });

  return NextResponse.json(result);
}
