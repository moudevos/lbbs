import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const { data: previous } = await context.admin.from("branches").select("name,address,phone,is_active,image_alt").eq("id", params.id).maybeSingle();
  const patch = {
    name: body.name,
    address: body.address ?? null,
    phone: body.phone ?? null,
    is_active: body.isActive ?? body.is_active ?? true,
    image_alt: body.imageAlt?.trim() || null
  };
  const { data, error } = await context.admin.from("branches").update(patch).eq("id", params.id).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "branches",
    recordId: data.id,
    previousData: previous,
    newData: {
      ...patch,
      ...(previous?.image_alt !== patch.image_alt ? { event: "branch_image_alt_updated" } : {})
    }
  });
  return NextResponse.json({ ok: true });
}
