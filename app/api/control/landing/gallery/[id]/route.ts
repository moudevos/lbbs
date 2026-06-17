import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const allowedFields = new Set(["title", "description", "service_name", "barber_name", "alt_text", "is_active", "sort_order", "featured"]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json() as Record<string, unknown>;
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowedFields.has(key)));
  if (typeof patch.title !== "string" || !patch.title.trim()) {
    return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });
  }
  patch.title = patch.title.trim();

  const { data: previous } = await context.admin.from("landing_assets").select("*").eq("id", params.id).eq("asset_type", "work_gallery").maybeSingle();
  if (!previous) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  const { error } = await context.admin.from("landing_assets").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "landing_assets",
    recordId: params.id,
    previousData: previous,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { data: previous } = await context.admin.from("landing_assets").select("*").eq("id", params.id).eq("asset_type", "work_gallery").maybeSingle();
  if (!previous) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

  const { error } = await context.admin.from("landing_assets").update({ is_active: false }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "delete",
    tableName: "landing_assets",
    recordId: params.id,
    previousData: previous,
    newData: { is_active: false }
  });
  return NextResponse.json({ ok: true });
}

