import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const SETTINGS_KEY = "business_profile";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const { data, error } = await context.admin.from("app_settings").select("key,value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    settings: data?.value ?? {
      businessName: "La Bajadita Barber Shop",
      customServiceDurationMinutes: 60,
      visualTheme: "black-gold",
      phones: [],
      socialLinks: [],
      landingPlaceholders: []
    }
  });
}

export async function PATCH(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  const body = await request.json();
  const { error } = await context.admin.from("app_settings").upsert({ key: SETTINGS_KEY, value: body }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "app_settings",
    newData: body
  });
  return NextResponse.json({ ok: true });
}
