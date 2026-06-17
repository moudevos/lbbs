import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

async function replaceLinks(admin: any, bonusId: string, serviceIds: string[] = [], barberIds: string[] = []) {
  await admin.from("bonus_config_services").delete().eq("bonus_config_id", bonusId);
  if (serviceIds.length > 0) {
    await admin.from("bonus_config_services").insert(serviceIds.map((serviceId) => ({ bonus_config_id: bonusId, service_id: serviceId })));
  }
  await admin.from("bonus_config_barbers").delete().eq("bonus_config_id", bonusId);
  if (barberIds.length > 0) {
    await admin.from("bonus_config_barbers").insert(barberIds.map((barberId) => ({ bonus_config_id: bonusId, barber_id: barberId })));
  }
}

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const { data, error } = await context.admin
    .from("bonus_configs")
    .select("*,bonus_config_services(service_id),bonus_config_barbers(barber_id),branches(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bonuses: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const payload = {
    name: body.name,
    amount: Number(body.amount ?? 0),
    period: body.period ?? "mensual",
    target_type: body.targetType ?? "production_amount",
    target_amount: body.targetType === "service_count" ? null : Number(body.targetAmount ?? 0),
    target_count: body.targetType === "service_count" ? Number(body.targetCount ?? 0) : null,
    branch_id: body.branchId || null,
    applies_all_barbers: Boolean(body.appliesAllBarbers),
    is_active: body.isActive ?? true,
    created_by: context.employee.userId
  };

  const { data, error } = await context.admin.from("bonus_configs").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await replaceLinks(context.admin, data.id, body.serviceIds ?? [], payload.applies_all_barbers ? [] : body.barberIds ?? []);

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "bonus_configs",
    recordId: data.id,
    newData: { ...payload, serviceIds: body.serviceIds ?? [], barberIds: body.barberIds ?? [] }
  });

  return NextResponse.json({ bonus: data });
}
