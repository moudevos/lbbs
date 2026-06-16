import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { isValidPeruMobilePhone, normalizePhone } from "@/lib/customers/phone";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  if (!body.phone || !isValidPeruMobilePhone(body.phone)) return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  const normalizedPhone = normalizePhone(body.phone);
  const { data: existing } = await context.admin
    .from("customers")
    .select("id")
    .eq("normalized_phone", normalizedPhone)
    .neq("id", params.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Ya existe otro cliente con ese celular" }, { status: 409 });
  const patch = {
    phone: body.phone,
    normalized_phone: normalizedPhone,
    full_name: body.fullName,
    notes: body.notes ?? null,
    branch_id: context.employee.role === "admin" ? body.branchId || null : context.employee.branchId,
    is_active: body.isActive ?? body.is_active ?? true
  };
  const { error } = await context.admin.from("customers").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "customers",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
