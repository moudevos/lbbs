import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { nextCode } from "@/lib/control/codes";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  const scope = resolveBranchScope(context.employee, branchId);

  let query = context.admin
    .from("products")
    .select("id,sku,name,description,category,sale_price,cost,cost_price,branch_id,is_active,counts_for_seller_credit,seller_credit_amount,branches(name),product_branch_stock(id,branch_id,stock_current,stock_minimum,updated_at,branches(name))")
    .order("sku");

  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.or(`branch_id.is.null,branch_id.eq.${scope.branchId}`);
  } else {
    query = query.or(`branch_id.is.null,branch_id.eq.${context.employee.branchId}`);
  }
  if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%,category.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const visibleBranchId = context.employee.role === "admin" && scope.mode === "branch"
    ? scope.branchId
    : context.employee.role === "admin"
      ? null
      : context.employee.branchId;
  const products = (data ?? []).map((product: any) => ({
    ...product,
    product_branch_stock: visibleBranchId
      ? (product.product_branch_stock ?? []).filter((stock: any) => stock.branch_id === visibleBranchId)
      : product.product_branch_stock ?? []
  }));
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const sku = await nextCode(context.admin, "products", "sku", "PROD", 4);
  const payload = {
    sku,
    name: body.name,
    description: body.description ?? null,
    category: body.category ?? null,
    sale_price: Number(body.salePrice ?? 0),
    cost: body.cost === "" || body.cost == null ? null : Number(body.cost),
    cost_price: body.cost === "" || body.cost == null ? 0 : Number(body.cost),
    branch_id: body.branchId || null,
    counts_for_seller_credit: Boolean(body.countsForSellerCredit),
    seller_credit_amount: Number(body.sellerCreditAmount ?? 2),
    is_active: true
  };

  const { data, error } = await context.admin.from("products").insert(payload).select("id,sku").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const branches = body.branchId
    ? [{ id: body.branchId }]
    : (await context.admin.from("branches").select("id").eq("is_active", true)).data ?? [];
  if (branches.length > 0) {
    await context.admin.from("product_branch_stock").upsert(
      branches.map((branch: { id: string }) => ({
        product_id: data.id,
        branch_id: branch.id,
        stock_current: Number(body.stockCurrent ?? 0),
        stock_minimum: Number(body.stockMinimum ?? 0)
      })),
      { onConflict: "product_id,branch_id" }
    );
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "products",
    recordId: data.id,
    newData: payload
  });

  return NextResponse.json({ product: data });
}
