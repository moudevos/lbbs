import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const branchId = request.nextUrl.searchParams.get("branch_id");
  let query = context.admin.from("notification_events")
    .select("id,type,title,body,url,created_at,read_at,branch_id")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false }).limit(30);
  if (context.employee.role !== "admin") query = query.eq("branch_id", context.employee.branchId);
  else if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    notifications: (data ?? []).map((row) => ({
      id: row.id, type: row.type, title: row.title, message: row.body,
      href: row.url, createdAt: row.created_at, read: Boolean(row.read_at)
    }))
  });
}
