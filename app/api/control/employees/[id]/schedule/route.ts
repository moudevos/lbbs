import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const schedules = Array.isArray(body.schedules) ? body.schedules : [];
  const rows = schedules.map((item: { dayOfWeek: number; startsAt: string; endsAt: string; isActive?: boolean }) => ({
    employee_id: params.id,
    day_of_week: item.dayOfWeek,
    starts_at: item.startsAt,
    ends_at: item.endsAt,
    is_active: item.isActive ?? true
  }));
  const { error } = await context.admin.from("employee_schedules").upsert(rows, { onConflict: "employee_id,day_of_week" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "employee_schedules",
    recordId: params.id,
    newData: { count: rows.length }
  });
  return NextResponse.json({ ok: true });
}
