import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { data, error } = await context.admin
    .from("branch_schedules")
    .select("day_of_week,opens_at,closes_at,is_active")
    .eq("branch_id", params.id)
    .order("day_of_week");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    schedules: (data ?? []).map((item) => ({
      dayOfWeek: item.day_of_week,
      opensAt: item.opens_at?.slice(0, 5),
      closesAt: item.closes_at?.slice(0, 5),
      isActive: item.is_active
    }))
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const schedules = Array.isArray(body.schedules) ? body.schedules : [];
  const rows = schedules.map((item: { dayOfWeek: number; opensAt: string; closesAt: string; isActive?: boolean }) => ({
    branch_id: params.id,
    day_of_week: item.dayOfWeek,
    opens_at: item.opensAt,
    closes_at: item.closesAt,
    is_active: item.isActive ?? true
  }));
  const { error } = await context.admin.from("branch_schedules").upsert(rows, { onConflict: "branch_id,day_of_week" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "branch_schedules",
    recordId: params.id,
    newData: { count: rows.length }
  });
  return NextResponse.json({ ok: true });
}
