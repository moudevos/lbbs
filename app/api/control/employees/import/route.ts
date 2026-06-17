import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { rows = [] } = await request.json();
  const { data: branches } = await context.admin.from("branches").select("id,code");
  const branchByCode = new Map((branches ?? []).map((branch) => [branch.code, branch.id]));
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const [index, row] of rows.entries()) {
    const role = row.rol || row.role;
    const branchId = branchByCode.get(row.sede_codigo);
    if (!row.nombre || !row.apellido || !["admin", "recepcion", "barbero"].includes(role) || ((role === "recepcion" || role === "barbero") && !branchId)) {
      skipped += 1;
      errors.push(`Fila ${index + 1}: datos invalidos`);
      continue;
    }
    const code = await nextCode(context.admin, "employees", "code", "EMP", 3);
    const { error } = await context.admin.from("employees").insert({
      code,
      first_name: row.nombre,
      last_name: row.apellido,
      email: row.email || null,
      phone: row.celular || null,
      role,
      branch_id: branchId ?? null,
      nickname: row.apodo || null,
      specialty: row.especialidad || null,
      can_perform_services: role === "barbero" || String(row.puede_realizar_servicios ?? "false").toLowerCase() === "true",
      production_percentage: Number(row.porcentaje_produccion ?? 50),
      is_active: String(row.activo ?? "true").toLowerCase() !== "false",
      onboarding_status: "internal_only"
    });
    if (error) errors.push(`Fila ${index + 1}: ${error.message}`);
    else created += 1;
  }
  await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "create", tableName: "employees", newData: { event: "bulk_import_internal_employees", read: rows.length, created, skipped } });
  return NextResponse.json({ read: rows.length, created, skipped, errors });
}
