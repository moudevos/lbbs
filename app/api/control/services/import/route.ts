import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { writeAuditLog } from "@/lib/audit";
import { parseXlsxFile } from "@/lib/excel/parse-xlsx";

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const contentType = request.headers.get("content-type") ?? "";
  let rows: Record<string, unknown>[] = [];
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Archivo XLSX requerido" }, { status: 400 });
    rows = await parseXlsxFile(file);
  } else {
    rows = ((await request.json()).rows ?? []) as Record<string, unknown>[];
  }
  const { data: branches } = await context.admin.from("branches").select("id,code");
  const branchByCode = new Map((branches ?? []).map((branch) => [branch.code, branch.id]));
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const [index, row] of rows.entries()) {
    const name = String(row.nombre || row.name || "").trim();
    const duration = Number(row.duracion_minutos ?? row.durationMinutes);
    const price = Number(row.precio ?? row.price ?? 0);
    const global = String(row.global ?? "false").toLowerCase() === "true";
    const globalRaw = String(row.global ?? "").toLowerCase();
    const branchId = global ? null : branchByCode.get(String(row.sede_codigo ?? ""));
    if (!name || duration <= 0 || price < 0 || !["true", "false"].includes(globalRaw) || (!global && !branchId)) {
      skipped += 1;
      errors.push(`Fila ${index + 1}: datos invalidos`);
      continue;
    }
    let duplicateQuery = context.admin
      .from("services")
      .select("id")
      .ilike("name", name);
    duplicateQuery = global ? duplicateQuery.is("branch_id", null) : duplicateQuery.eq("branch_id", branchId);
    const { data: duplicate } = await duplicateQuery.maybeSingle();
    if (duplicate) {
      skipped += 1;
      errors.push(`Fila ${index + 1}: servicio duplicado`);
      continue;
    }
    const sku = await nextCode(context.admin, "services", "sku", "SRV", 4);
    const { error } = await context.admin.from("services").insert({
      sku,
      name,
      description: row.descripcion ?? null,
      duration_minutes: duration,
      price,
      branch_id: branchId,
      is_active: String(row.activo ?? "true").toLowerCase() !== "false"
    });
    if (error) errors.push(`Fila ${index + 1}: ${error.message}`);
    else created += 1;
  }
  await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "create", tableName: "services", newData: { event: "bulk_import", read: rows.length, created, skipped } });
  return NextResponse.json({ read: rows.length, created, skipped, errors });
}
