import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { normalizeCustomerImportRow } from "@/lib/customers/import";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const branchId = context.employee.role === "admin" ? body.branchId || context.employee.branchId : context.employee.branchId;
  if (!branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });

  let created = 0;
  let updated = 0;
  let existing = 0;
  let skipped = 0;
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of rows.entries()) {
    const row = normalizeCustomerImportRow(raw);
    if (!row.normalizedPhone || seen.has(row.normalizedPhone)) {
      skipped += 1;
      continue;
    }
    seen.add(row.normalizedPhone);
    const { data: found, error: findError } = await context.admin.from("customers").select("id,full_name,phone,notes").eq("normalized_phone", row.normalizedPhone).maybeSingle();
    if (findError) {
      errors.push(`Fila ${index + 1}: ${findError.message}`);
      continue;
    }
    if (found) {
      existing += 1;
      const patch: Record<string, unknown> = {};
      if (!found.full_name && row.fullName) patch.full_name = row.fullName;
      if (!found.phone && row.phone) patch.phone = row.phone;
      if (!found.notes && row.email) patch.notes = `Email importado: ${row.email}`;
      if (Object.keys(patch).length) {
        const { error } = await context.admin.from("customers").update(patch).eq("id", found.id);
        if (error) errors.push(`Fila ${index + 1}: ${error.message}`);
        else updated += 1;
      }
      continue;
    }
    const { error } = await context.admin.from("customers").insert({
      full_name: row.fullName,
      phone: row.phone,
      normalized_phone: row.normalizedPhone,
      branch_id: branchId,
      notes: row.email ? `Email importado: ${row.email}` : null
    });
    if (error) errors.push(`Fila ${index + 1}: ${error.message}`);
    else created += 1;
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "customers",
    newData: { event: "bulk_import_confirmed", read: rows.length, created, updated, existing, skipped, errors: errors.length }
  });
  return NextResponse.json({ read: rows.length, created, updated, existing, skipped, errors });
}
