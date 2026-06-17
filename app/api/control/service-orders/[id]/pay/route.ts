import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { payServiceOrder } from "@/lib/service-orders/server";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const response = await payServiceOrder(context.admin, params.id, body.method as PaymentMethod, body.splits as PaymentSplit[], context.employee.userId);
  if (response.status < 400) {
    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId,
      actorRole: context.employee.role,
      actorBranchId: context.employee.branchId,
      eventType: "payment",
      tableName: "service_orders",
      recordId: params.id,
      newData: { method: body.method, splits: body.splits }
    });
  }
  return response;
}
