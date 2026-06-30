import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { normalizeCustomerImportRow } from "@/lib/customers/import";
import { writeAuditLog } from "@/lib/audit";

type NormalizedPreviewRow = ReturnType<typeof normalizeCustomerImportRow> & { index: number };
const LOOKUP_CHUNK_SIZE = 500;

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
  const seen = new Set<string>();
  const normalizedRows: NormalizedPreviewRow[] = rows.map((row: any, index: number) => ({ index, ...normalizeCustomerImportRow(row) }));
  const phones = Array.from(new Set(normalizedRows.map((row: NormalizedPreviewRow) => row.normalizedPhone).filter(Boolean)));
  const existing: any[] = [];
  for (const phoneChunk of chunk(phones, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await context.admin.from("customers").select("id,normalized_phone,full_name").in("normalized_phone", phoneChunk);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    existing.push(...(data ?? []));
  }
  const existingMap = new Map((existing ?? []).map((row: any) => [row.normalized_phone, row]));
  const preview = normalizedRows.map((row) => {
    let status = "nuevo";
    let observation = "Listo para importar";
    if (!row.normalizedPhone) {
      status = "invalido";
      observation = "Celular invalido o vacio";
    } else if (seen.has(row.normalizedPhone)) {
      status = "duplicado";
      observation = "Duplicado dentro del archivo";
    } else if (existingMap.has(row.normalizedPhone)) {
      status = "existente";
      observation = "Ya existe en clientes";
    }
    if (row.normalizedPhone) seen.add(row.normalizedPhone);
    return {
      fila: row.index + 1,
      fullname: row.fullName,
      phone: row.phone,
      normalizedPhone: row.normalizedPhone,
      notes: row.notes || "",
      sede: row.branch ?? "Sin sede",
      status,
      observation
    };
  });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "customers",
    newData: { read: rows.length, valid: preview.filter((row) => row.status === "nuevo").length }
  });
  return NextResponse.json({
    read: rows.length,
    preview,
    newCount: preview.filter((row) => row.status === "nuevo").length,
    existingCount: preview.filter((row) => row.status === "existente").length,
    skippedCount: preview.filter((row) => row.status === "invalido" || row.status === "duplicado").length
  });
}
