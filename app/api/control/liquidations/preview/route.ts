import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { buildLiquidationPreview } from "@/lib/liquidations/server";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const barberId = request.nextUrl.searchParams.get("barber_id") ?? (context.employee.role === "barbero" ? context.employee.employeeId : "");
  const branchId = request.nextUrl.searchParams.get("branch_id");
  if (!from || !to || !barberId) return NextResponse.json({ error: "Periodo y barbero requeridos" }, { status: 400 });
  if (context.employee.role === "barbero" && barberId !== context.employee.employeeId) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  try {
    const preview = await buildLiquidationPreview(context.admin, { from, to, barberId, branchId });
    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId,
      actorRole: context.employee.role,
      actorBranchId: context.employee.branchId,
      eventType: "update",
      tableName: "barber_liquidations",
      newData: { from, to, barberId, branchId, periodStart: preview.periodStart, periodEnd: preview.periodEnd }
    });
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo previsualizar" }, { status: 500 });
  }
}
