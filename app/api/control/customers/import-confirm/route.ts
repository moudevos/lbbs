import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { normalizeCustomerImportRow } from "@/lib/customers/import";
import { writeAuditLog } from "@/lib/audit";

const LOOKUP_CHUNK_SIZE = 500;
const INSERT_CHUNK_SIZE = 200;
type NormalizedImportRow = ReturnType<typeof normalizeCustomerImportRow> & { index: number };

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const normalizedRows: NormalizedImportRow[] = rows.map((raw: any, index: number) => ({ index, ...normalizeCustomerImportRow(raw) }));
  const validRows = normalizedRows.filter((row: NormalizedImportRow) => {
    if (!row.normalizedPhone) return false;
    if (seen.has(row.normalizedPhone)) return false;
    seen.add(row.normalizedPhone);
    return true;
  });

  const skipped = rows.length - validRows.length;
  const phones = validRows.map((row) => row.normalizedPhone);
  const existingRows: any[] = [];

  for (const phoneChunk of chunk(phones, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await context.admin
      .from("customers")
      .select("id,normalized_phone")
      .in("normalized_phone", phoneChunk);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    existingRows.push(...(data ?? []));
  }

  const existingPhones = new Set(existingRows.map((row) => row.normalized_phone));
  const rowsToCreate = validRows
    .filter((row: NormalizedImportRow) => !existingPhones.has(row.normalizedPhone))
    .map((row: NormalizedImportRow) => ({
      full_name: row.fullName,
      phone: row.phone,
      normalized_phone: row.normalizedPhone,
      branch_id: null,
      notes: row.notes || null
    }));

  let created = 0;
  for (const insertChunk of chunk(rowsToCreate, INSERT_CHUNK_SIZE)) {
    const { error } = await context.admin.from("customers").insert(insertChunk);
    if (error) {
      errors.push(error.message);
      continue;
    }
    created += insertChunk.length;
  }

  const existing = existingRows.length;
  const updated = 0;

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "customers",
    newData: {
      event: "bulk_import_confirmed",
      source: "xlsx",
      read: rows.length,
      created,
      updated,
      existing,
      skipped,
      errors: errors.length
    }
  });

  return NextResponse.json({ read: rows.length, created, updated, existing, skipped, errors });
}
