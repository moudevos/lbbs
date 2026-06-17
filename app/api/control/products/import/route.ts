import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { parseXlsxFile } from "@/lib/excel/parse-xlsx";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo XLSX requerido" }, { status: 400 });
  const rows = await parseXlsxFile(file);
  const { data: branches } = await context.admin.from("branches").select("id,code");
  const branchByCode = new Map((branches ?? []).map((branch) => [branch.code, branch.id]));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const name = String(row.nombre ?? "").trim();
    const category = String(row.categoria ?? "").trim();
    const branchId = branchByCode.get(String(row.sede_codigo ?? ""));
    const salePrice = Number(row.precio_venta ?? 0);
    const cost = row.costo === "" ? null : Number(row.costo ?? 0);
    const stockCurrent = Number(row.stock_inicial ?? 0);
    const stockMinimum = Number(row.stock_minimo ?? 0);
    if (!name || !["snack", "barber_product"].includes(category) || !branchId || salePrice < 0 || stockCurrent < 0 || stockMinimum < 0) {
      skipped += 1;
      errors.push(`Fila ${index + 1}: datos invalidos`);
      continue;
    }
    const { data: duplicate } = await context.admin.from("products").select("id").ilike("name", name).eq("branch_id", branchId).maybeSingle();
    if (duplicate) {
      skipped += 1;
      errors.push(`Fila ${index + 1}: producto duplicado`);
      continue;
    }
    const countsCredit = category === "barber_product" && String(row.cuenta_credito_vendedor ?? "false").toLowerCase() === "true";
    const sku = await nextCode(context.admin, "products", "sku", "PROD", 4);
    const { data: product, error } = await context.admin.from("products").insert({
      sku,
      name,
      description: row.descripcion || null,
      category,
      sale_price: salePrice,
      cost,
      branch_id: branchId,
      counts_for_seller_credit: countsCredit,
      seller_credit_amount: countsCredit ? Number(row.credito_vendedor ?? 2) : 0,
      is_active: String(row.activo ?? "true").toLowerCase() !== "false"
    }).select("id").single();
    if (error || !product) {
      errors.push(`Fila ${index + 1}: ${error?.message ?? "No se pudo crear"}`);
      continue;
    }
    await context.admin.from("product_branch_stock").upsert({
      product_id: product.id,
      branch_id: branchId,
      stock_current: stockCurrent,
      stock_minimum: stockMinimum
    }, { onConflict: "product_id,branch_id" });
    created += 1;
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "products",
    newData: { event: "bulk_import_products", read: rows.length, created, skipped, errors: errors.length }
  });

  return NextResponse.json({ read: rows.length, created, skipped, errors });
}
