import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { normalizeOperationalPaymentMethod, round } from "@/lib/cash/operational-movements";
import { requireEmployee } from "@/lib/control/api";
import { parsePeruDateTime, toPeruDate } from "@/lib/datetime/peru-time";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (!["admin", "recepcion"].includes(context.employee.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const branchId = context.employee.role === "admin" ? String(body.branchId ?? "") : context.employee.branchId;
  const productId = String(body.productId ?? "");
  const responsibleEmployeeId = body.responsibleEmployeeId ? String(body.responsibleEmployeeId) : context.employee.employeeId;
  const quantity = Math.trunc(Number(body.quantity ?? 0));
  const amount = round(body.amount);
  const paymentMethod = normalizeOperationalPaymentMethod(body.paymentMethod ?? "efectivo");
  const description = String(body.description ?? "").trim();
  const occurredAt = parseOccurredAt(body.occurredAt);
  const operationDate = toPeruDate(occurredAt);

  if (!branchId || branchId === "all") return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
  if (!productId) return NextResponse.json({ error: "Producto requerido" }, { status: 400 });
  if (quantity <= 0) return NextResponse.json({ error: "Cantidad debe ser mayor a 0" }, { status: 400 });
  if (amount <= 0) return NextResponse.json({ error: "Monto debe ser mayor a 0" }, { status: 400 });
  if (!paymentMethod || paymentMethod !== "efectivo") return NextResponse.json({ error: "La reposicion con caja solo permite efectivo" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Descripcion requerida" }, { status: 400 });

  const { data: closure } = await context.admin
    .from("cash_closures")
    .select("id,status")
    .eq("branch_id", branchId)
    .eq("closure_date", operationDate)
    .maybeSingle();
  if (closure?.status === "closed") {
    return NextResponse.json({ error: "La caja de esa sede y fecha ya esta cerrada." }, { status: 409 });
  }

  const { data: product, error: productError } = await context.admin
    .from("products")
    .select("id,name,branch_id,is_active")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });
  if (!product?.is_active) return NextResponse.json({ error: "Producto no disponible" }, { status: 400 });
  if (product.branch_id && product.branch_id !== branchId) return NextResponse.json({ error: "El producto no pertenece a la sede seleccionada" }, { status: 400 });

  const { data: responsible } = await context.admin
    .from("employees")
    .select("id,branch_id,is_active")
    .eq("id", responsibleEmployeeId)
    .maybeSingle();
  if (!responsible?.is_active) return NextResponse.json({ error: "Responsable invalido" }, { status: 400 });
  if (responsible.branch_id && responsible.branch_id !== branchId) return NextResponse.json({ error: "El responsable no pertenece a la sede seleccionada" }, { status: 400 });

  const { data: stock } = await context.admin
    .from("product_branch_stock")
    .select("id,stock_current,stock_minimum")
    .eq("product_id", productId)
    .eq("branch_id", branchId)
    .maybeSingle();

  const previousStock = Number(stock?.stock_current ?? 0);
  const stockMinimum = Number(stock?.stock_minimum ?? 0);
  const newStock = previousStock + quantity;
  const unitCost = round(amount / quantity);
  const metadata = {
    quantity,
    amount,
    unit_cost: unitCost,
    payment_method: paymentMethod,
    responsible_employee_id: responsibleEmployeeId,
    operation_date: operationDate
  };

  const { data: cashMovement, error: cashError } = await context.admin
    .from("cash_operational_movements")
    .insert({
      branch_id: branchId,
      movement_type: "stock_replenishment",
      direction: "out",
      amount,
      payment_method: paymentMethod,
      status: "active",
      description,
      responsible_employee_id: responsibleEmployeeId,
      created_by: context.employee.userId,
      related_product_id: productId,
      metadata,
      occurred_at: occurredAt.toISOString()
    })
    .select("id")
    .single();
  if (cashError || !cashMovement) return NextResponse.json({ error: cashError?.message ?? "No se pudo registrar salida de caja" }, { status: 500 });

  const { error: stockError } = await context.admin.from("product_branch_stock").upsert(
    {
      product_id: productId,
      branch_id: branchId,
      stock_current: newStock,
      stock_minimum: stockMinimum,
      updated_at: new Date().toISOString()
    },
    { onConflict: "product_id,branch_id" }
  );
  if (stockError) {
    await context.admin.from("cash_operational_movements").delete().eq("id", cashMovement.id);
    return NextResponse.json({ error: stockError.message }, { status: 500 });
  }

  const movementPayload = {
    product_id: productId,
    branch_id: branchId,
    movement_type: "adjustment",
    movement_kind: "reposicion_caja",
    quantity,
    quantity_delta: quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    reason: `Entrada por reposicion con caja: ${description}`,
    reference: `cash_operational:${cashMovement.id}`,
    created_by: context.employee.userId,
    actor_user_id: context.employee.userId,
    metadata: { ...metadata, cash_operational_movement_id: cashMovement.id }
  };
  const { data: stockMovement, error: movementError } = await context.admin
    .from("product_stock_movements")
    .insert(movementPayload)
    .select("id")
    .single();
  if (movementError || !stockMovement) {
    await context.admin.from("product_branch_stock").upsert(
      {
        product_id: productId,
        branch_id: branchId,
        stock_current: previousStock,
        stock_minimum: stockMinimum,
        updated_at: new Date().toISOString()
      },
      { onConflict: "product_id,branch_id" }
    );
    await context.admin.from("cash_operational_movements").delete().eq("id", cashMovement.id);
    return NextResponse.json({ error: movementError?.message ?? "No se pudo registrar kardex" }, { status: 500 });
  }

  const { error: linkError } = await context.admin
    .from("cash_operational_movements")
    .update({
      related_stock_movement_id: stockMovement.id,
      metadata: { ...metadata, stock_movement_id: stockMovement.id }
    })
    .eq("id", cashMovement.id);
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "cash_operational_movements",
    recordId: cashMovement.id,
    newData: { event: "stock_replenishment_cash", branch_id: branchId, product_id: productId, quantity, amount, payment_method: paymentMethod }
  });

  return NextResponse.json({ ok: true, id: cashMovement.id, stockMovementId: stockMovement.id, stockCurrent: newStock });
}

function parseOccurredAt(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date();
  if (raw.includes("T") && !raw.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    const [date, time] = raw.split("T");
    return parsePeruDateTime(date, time);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
