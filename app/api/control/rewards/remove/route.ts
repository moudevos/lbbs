import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { removeAppliedReward } from "@/lib/rewards/server";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const result = await removeAppliedReward(context.admin, String(body.serviceOrderId ?? ""), context.employee.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "update", tableName: "customer_reward_redemptions", newData: { service_order_id: body.serviceOrderId, status: "cancelled" }
  });
  return NextResponse.json(result);
}

