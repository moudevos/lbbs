import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/control/api";
import { grantInitialReward } from "@/lib/rewards/server";

export async function POST(request: NextRequest, { params }: { params: { customerId: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const body = await request.json();
  const reason = String(body.reason ?? "").trim();
  const result = await grantInitialReward(context.admin, params.customerId, context.employee.userId, reason);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "customer_reward_ledger",
    recordId: params.customerId,
    newData: {
      event: "reward_manual_grant",
      customer_id: params.customerId,
      reason
    }
  });

  return NextResponse.json(result);
}
