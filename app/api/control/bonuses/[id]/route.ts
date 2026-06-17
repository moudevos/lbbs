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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();

  const { data: previous } = await context.admin.from("bonus_configs").select("*").eq("id", params.id).maybeSingle();
  const patch = {
    name: body.name,
    amount: Number(body.amount ?? 0),
    period: body.period ?? "mensual",
    target_type: body.targetType ?? "production_amount",
    target_amount: body.targetType === "service_count" ? null : Number(body.targetAmount ?? 0),
    target_count: body.targetType === "service_count" ? Number(body.targetCount ?? 0) : null,
    branch_id: body.branchId || null,
    applies_all_barbers: Boolean(body.appliesAllBarbers),
    is_active: Boolean(body.isActive)
  };

  const { data, error } = await context.admin.from("bonus_configs").update(patch).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await replaceLinks(context.admin, params.id, body.serviceIds ?? [], patch.applies_all_barbers ? [] : body.barberIds ?? []);

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "bonus_configs",
    recordId: params.id,
    previousData: previous,
    newData: { ...patch, serviceIds: body.serviceIds ?? [], barberIds: body.barberIds ?? [] }
  });

  return NextResponse.json({ bonus: data });
}
