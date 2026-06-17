import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { normalizePhone } from "@/lib/customers/phone";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const branchId = context.employee.role === "admin" ? body.branchId || context.employee.branchId : context.employee.branchId;
  if (!branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });

  let created = 0;
  let existing = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const phone = row.phone || row["Phone 1 - Value"] || row["Phone 2 - Value"] || "";
    const normalized = normalizePhone(phone);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    const name = row.fullName || row.Name || `${row["Given Name"] ?? ""} ${row["Family Name"] ?? ""}`.trim() || `Cliente ${normalized}`;
    const { data: found, error: findError } = await context.admin.from("customers").select("id,full_name").eq("normalized_phone", normalized).maybeSingle();
    if (findError) {
      errors.push(`Fila ${index + 1}: ${findError.message}`);
      continue;
    }
    if (found) {
      existing += 1;
      if (!found.full_name && name) await context.admin.from("customers").update({ full_name: name }).eq("id", found.id);
      continue;
    }
    const { error } = await context.admin.from("customers").insert({
      full_name: name,
      phone,
      normalized_phone: normalized,
      branch_id: branchId,
      notes: row["E-mail 1 - Value"] ? `Email importado: ${row["E-mail 1 - Value"]}` : null
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
    newData: { event: "bulk_import_google_contacts", read: rows.length, created, existing, skipped, errors: errors.length }
  });

  return NextResponse.json({ read: rows.length, created, existing, skipped, errors });
}
