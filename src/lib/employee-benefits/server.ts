import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentEmployee } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/audit";
import type { EmployeeBenefitType } from "./types";

type Admin = SupabaseClient<any, "public", any>;

export function limaMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}-01`;
}

export function canCreateBenefit(actor: CurrentEmployee, type: EmployeeBenefitType, employeeId: string, branchId: string) {
  if (actor.role === "admin") return true;
  if (actor.role === "recepcion") {
    return actor.branchId === branchId && ["free_haircut", "cafeteria_cash", "barber_product_cash"].includes(type);
  }
  return type === "free_haircut" && actor.employeeId === employeeId && actor.branchId === branchId;
}

export async function adjustBenefitStock(input: {
  admin: Admin; productId: string; branchId: string; quantity: number;
  direction: "out" | "in"; actor: CurrentEmployee; reason: string;
}) {
  const { admin, productId, branchId, quantity, direction, actor, reason } = input;
  const { data: stock, error: stockError } = await admin.from("product_branch_stock")
    .select("stock_current,stock_minimum").eq("product_id", productId).eq("branch_id", branchId).maybeSingle();
  if (stockError) return { error: stockError.message };
  if (!stock) return { movementId: null };
  const previous = Number(stock.stock_current ?? 0);
  const delta = direction === "out" ? -quantity : quantity;
  const next = previous + delta;
  if (next < 0) return { error: "Stock insuficiente para registrar el beneficio" };
  const { error: updateError } = await admin.from("product_branch_stock").update({
    stock_current: next, updated_at: new Date().toISOString()
  }).eq("product_id", productId).eq("branch_id", branchId);
  if (updateError) return { error: updateError.message };
  const { data: movement, error } = await admin.from("product_stock_movements").insert({
    product_id: productId, branch_id: branchId, movement_type: direction === "out" ? "sale" : "void",
    movement_kind: direction === "out" ? "venta" : "anulacion_venta",
    quantity, quantity_delta: delta, previous_stock: previous, new_stock: next,
    reason, reference: "employee_benefit", created_by: actor.userId, actor_user_id: actor.userId
  }).select("id").single();
  if (error) {
    await admin.from("product_branch_stock").update({ stock_current: previous }).eq("product_id", productId).eq("branch_id", branchId);
    return { error: error.message };
  }
  return { movementId: movement.id };
}

export async function createBenefitMovement(input: {
  admin: Admin; actor: CurrentEmployee; type: EmployeeBenefitType; body: any;
}) {
  const { admin, actor, type, body } = input;
  const employeeId = String(body.employeeId ?? "");
  const branchId = actor.role === "admin" ? String(body.branchId ?? "") : String(actor.branchId ?? "");
  if (!employeeId || !branchId) return { error: "Empleado y sede son requeridos", status: 400 };
  if (!canCreateBenefit(actor, type, employeeId, branchId)) return { error: "No tiene permiso para registrar este movimiento", status: 403 };
  const adminOnly = ["salary_advance", "manual_deduction", "manual_adjustment"];
  if (adminOnly.includes(type) && actor.role !== "admin") return { error: "Solo admin", status: 403 };
  if (adminOnly.includes(type) && !String(body.reason ?? "").trim()) return { error: "Motivo requerido", status: 400 };

  const quantity = Math.max(Number(body.quantity ?? 1), 0);
  const productTypes = ["cafeteria_cash", "cafeteria_credit", "barber_product_cash", "barber_product_credit"];
  let product: any = null;
  let unitPrice = Number(body.amount ?? 0);
  let discountAmount = 0;
  let stockMovementId: string | null = null;

  if (productTypes.includes(type)) {
    if (!body.productId || quantity <= 0) return { error: "Producto y cantidad validos son requeridos", status: 400 };
    const { data, error } = await admin.from("products")
      .select("id,name,category,sale_price,cost,cost_price,is_active")
      .eq("id", body.productId).maybeSingle();
    if (error || !data?.is_active) return { error: error?.message ?? "Producto no disponible", status: 400 };
    product = data;
    if (type.startsWith("barber_product")) {
      const baseCost = Number(product.cost_price ?? product.cost ?? 0);
      const { data: setting } = await admin.from("app_settings").select("value").eq("key", "employee_benefits_barber_product_markup_amount").maybeSingle();
      const markup = Number(setting?.value ?? 2);
      unitPrice = baseCost > 0 ? baseCost + markup : Number(body.amount ?? 0);
      if (baseCost <= 0 && !(actor.role === "admin" && unitPrice > 0 && String(body.reason ?? "").trim())) {
        return { error: "El producto no tiene costo configurado. Admin puede autorizarlo indicando un motivo.", status: 400 };
      }
    } else {
      const { data: setting } = await admin.from("app_settings").select("value").eq("key", "employee_benefits_cafeteria_discount_amount").maybeSingle();
      const discount = Number(setting?.value ?? 2);
      discountAmount = Math.min(Number(product.sale_price ?? 0), discount) * quantity;
      unitPrice = Math.max(Number(product.sale_price ?? 0) - discount, 0);
    }
    const stock = await adjustBenefitStock({
      admin, productId: product.id, branchId, quantity, direction: "out", actor,
      reason: `Beneficio empleado: ${type}`
    });
    if (stock.error) return { error: stock.error, status: 400 };
    stockMovementId = stock.movementId ?? null;
  }

  let total = Math.round(unitPrice * quantity * 100) / 100;
  if (type === "free_haircut") {
    const rawAmount = Number(body.amount ?? 0);
    total = rawAmount > 0 ? Math.round(rawAmount * 0.5 * 100) / 100 : 0;
    discountAmount = rawAmount > 0 ? Math.round(rawAmount * 0.5 * 100) / 100 : 0;
    unitPrice = total;
  }
  const payload = {
    employee_id: employeeId, branch_id: branchId, created_by: actor.employeeId,
    movement_type: type, benefit_month: limaMonthStart(), product_id: product?.id ?? null,
    quantity, unit_price: unitPrice, discount_amount: discountAmount, total_amount: total,
    payment_mode: type.endsWith("_cash") ? "cash" : type.endsWith("_credit") ? "credit" : null,
    payment_method: type.endsWith("_cash") ? body.paymentMethod ?? "efectivo" : null,
    stock_movement_id: stockMovementId, notes: body.notes ?? null, reason: body.reason ?? null,
    metadata: { product_name: product?.name ?? null, legacy_type: type === "free_haircut" ? "employee_haircut_50" : null }
  };
  const { data: movement, error } = await admin.from("employee_benefit_movements").insert(payload).select("id").single();
  if (error) {
    if (stockMovementId && product) await adjustBenefitStock({
      admin, productId: product.id, branchId, quantity, direction: "in", actor,
      reason: "Rollback beneficio no registrado"
    });
    return { error: error.code === "23505" ? "El empleado ya uso su corte 50% este mes" : error.message, status: error.code === "23505" ? 409 : 500 };
  }
  await writeAuditLog(admin, {
    actorUserId: actor.userId, actorRole: actor.role, actorBranchId: actor.branchId,
    eventType: "create", tableName: "employee_benefit_movements", recordId: movement.id, newData: payload
  });
  return { movementId: movement.id, status: 201 };
}
