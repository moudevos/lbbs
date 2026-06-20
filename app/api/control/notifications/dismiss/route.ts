import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  let query = context.admin.from("notification_events")
    .update({ dismissed_at: new Date().toISOString() });
  if (!body.all) {
    if (!ids.length) return NextResponse.json({ ok: true });
    query = query.in("id", ids);
  }
  if (context.employee.role !== "admin") query = query.eq("branch_id", context.employee.branchId);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
