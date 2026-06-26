import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { normalizeCustomerImportRow } from "@/lib/customers/import";
import { writeAuditLog } from "@/lib/audit";

type NormalizedPreviewRow = ReturnType<typeof normalizeCustomerImportRow> & { index: number };

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const seen = new Set<string>();
  const normalizedRows: NormalizedPreviewRow[] = rows.map((row: any, index: number) => ({ index, ...normalizeCustomerImportRow(row) }));
  const phones = normalizedRows.map((row: NormalizedPreviewRow) => row.normalizedPhone).filter(Boolean);
  const { data: existing } = phones.length
    ? await context.admin.from("customers").select("id,normalized_phone,full_name").in("normalized_phone", phones)
    : { data: [] as any[] };
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
    return { ...row, status, observation };
  });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "customers",
    newData: { read: rows.length, valid: preview.filter((row) => row.status === "nuevo").length }
  });
  return NextResponse.json({ read: rows.length, preview });
}
