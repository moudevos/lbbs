import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (body.courtesyEnabled && !body.courtesyRole) return NextResponse.json({ error: "Tipo de cortesia requerido" }, { status: 400 });

  const patch = {
    name: body.name,
    description: body.description ?? null,
    category: body.category ?? null,
    sale_price: Number(body.salePrice ?? 0),
    cost: body.cost === "" || body.cost == null ? null : Number(body.cost),
    cost_price: body.cost === "" || body.cost == null ? 0 : Number(body.cost),
    branch_id: body.branchId || null,
    tracks_stock: Boolean(body.tracksStock ?? true),
    courtesy_enabled: Boolean(body.courtesyEnabled && body.courtesyRole),
    courtesy_role: body.courtesyEnabled && body.courtesyRole ? body.courtesyRole : null,
    courtesy_label: body.courtesyEnabled ? body.courtesyLabel || body.name : null,
    counts_for_seller_credit: Boolean(body.countsForSellerCredit),
    seller_credit_amount: Number(body.sellerCreditAmount ?? 2)
  };

  const { data: previous } = await context.admin.from("products").select("*").eq("id", params.id).maybeSingle();
  const { error } = await context.admin.from("products").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.branchId) {
    await context.admin.from("product_branch_stock").upsert(
      {
        product_id: params.id,
        branch_id: body.branchId,
        stock_current: Number(body.stockCurrent ?? 0),
        stock_minimum: Number(body.stockMinimum ?? 0)
      },
      { onConflict: "product_id,branch_id" }
    );
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "products",
    recordId: params.id,
    previousData: previous,
    newData: patch
  });

  return NextResponse.json({ ok: true });
}
