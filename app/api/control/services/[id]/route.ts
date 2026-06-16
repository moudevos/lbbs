import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const price = body.price === "" || body.price == null ? null : Number(body.price);
  const { data: current, error: currentError } = await context.admin.from("services").select("sku").eq("id", params.id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: currentError?.message ?? "Servicio no encontrado" }, { status: 404 });
  if (price == null && current.sku !== "CUSTOM") return NextResponse.json({ error: "Precio requerido para servicios normales" }, { status: 400 });
  const patch = {
    name: body.name,
    description: body.description ?? null,
    duration_minutes: Number(body.durationMinutes),
    price: price == null ? null : price.toFixed(2),
    branch_id: body.branchId || null,
    is_active: body.isActive ?? body.is_active ?? true
  };
  if (!patch.name || patch.duration_minutes <= 0 || (price != null && (!Number.isFinite(price) || price < 0))) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }
  const { error } = await context.admin.from("services").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "services",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
