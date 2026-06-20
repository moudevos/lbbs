import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const movementKinds = ["ingreso", "ajuste_positivo", "ajuste_negativo"] as const;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const branchId = context.employee.role === "admin" ? body.branchId : context.employee.branchId;
  const movementKind = body.movementKind as typeof movementKinds[number];
  const quantity = Math.trunc(Number(body.quantity ?? 0));

  if (!branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
  if (!movementKinds.includes(movementKind)) return NextResponse.json({ error: "Tipo de movimiento invalido" }, { status: 400 });
  if (quantity <= 0) return NextResponse.json({ error: "Cantidad debe ser mayor a 0" }, { status: 400 });
  if ((movementKind === "ajuste_negativo" || movementKind === "ajuste_positivo") && !body.reason) {
    return NextResponse.json({ error: "Motivo requerido para ajustes" }, { status: 400 });
  }

  const { data: stock } = await context.admin
    .from("product_branch_stock")
    .select("id,stock_current,stock_minimum")
    .eq("product_id", params.id)
    .eq("branch_id", branchId)
    .maybeSingle();

  const previousStock = Number(stock?.stock_current ?? 0);
  const delta = movementKind === "ajuste_negativo" ? -quantity : quantity;
  const newStock = previousStock + delta;
  if (newStock < 0) return NextResponse.json({ error: "No se permite stock negativo" }, { status: 400 });

  await context.admin.from("product_branch_stock").upsert(
    {
      product_id: params.id,
      branch_id: branchId,
      stock_current: newStock,
      stock_minimum: Number(stock?.stock_minimum ?? body.stockMinimum ?? 0),
      updated_at: new Date().toISOString()
    },
    { onConflict: "product_id,branch_id" }
  );

  const movementPayload = {
    product_id: params.id,
    branch_id: branchId,
    movement_type: "adjustment",
    movement_kind: movementKind,
    quantity,
    quantity_delta: delta,
    previous_stock: previousStock,
    new_stock: newStock,
    reason: body.reason ?? null,
    reference: body.reference ?? null,
    created_by: context.employee.userId,
    actor_user_id: context.employee.userId
  };
  const { data: movement, error } = await context.admin
    .from("product_stock_movements")
    .insert(movementPayload)
    .select("id")
    .single();

  if (error) {
    await context.admin.from("product_branch_stock").upsert({
      product_id: params.id,
      branch_id: branchId,
      stock_current: previousStock,
      stock_minimum: Number(stock?.stock_minimum ?? body.stockMinimum ?? 0),
      updated_at: new Date().toISOString()
    }, { onConflict: "product_id,branch_id" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "product_stock_movements",
    recordId: movement.id,
    newData: movementPayload
  });

  return NextResponse.json({ ok: true, stockCurrent: newStock, movementId: movement.id });
}
