import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { allowedCourtesyTypesForAmount, courtesyTypeLabel, type CourtesyRole, type CourtesyType } from "./courtesy-rules";

type AdminClient = SupabaseClient<any, "public", any>;

export type CourtesySelection =
  | { kind: "single"; role: CourtesyRole; productId: string }
  | { kind: "combo"; comboType: "coffee_keke" | "cappuccino_keke"; items: { role: CourtesyRole; productId: string }[] };

export type CourtesyOption =
  | {
      kind: "single";
      role: CourtesyRole;
      label: string;
      productId: string;
      productName: string;
      stockCurrent: number;
      available: boolean;
      disabledReason?: string;
    }
  | {
      kind: "combo";
      comboType: "coffee_keke" | "cappuccino_keke";
      label: string;
      items: Array<{ role: CourtesyRole; productId: string; productName: string; stockCurrent: number }>;
      available: boolean;
      disabledReason?: string;
    };

type ProductRow = {
  id: string;
  name: string;
  courtesy_role: CourtesyRole | null;
  courtesy_label: string | null;
  branch_id: string | null;
  tracks_stock: boolean | null;
  product_branch_stock?: { branch_id: string; stock_current: number }[];
};

export async function resolveCourtesyProducts({
  admin,
  branchId,
  servicePrice,
  orderTotal
}: {
  admin: AdminClient;
  branchId: string;
  servicePrice?: number;
  orderTotal?: number;
}) {
  const amount = normalizeMoney(orderTotal ?? servicePrice ?? 0);
  const allowedByRule = allowedCourtesyTypesForAmount(amount);
  const roles = Array.from(new Set(allowedByRule.flatMap((type) => comboRoles(type))));
  if (!roles.length) return { allowedByRule, options: [] as CourtesyOption[] };

  const { data, error } = await admin
    .from("products")
    .select("id,name,courtesy_role,courtesy_label,branch_id,tracks_stock,product_branch_stock(branch_id,stock_current)")
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("courtesy_enabled", true)
    .in("courtesy_role", roles)
    .or(`branch_id.is.null,branch_id.eq.${branchId}`)
    .order("name");
  if (error) return { error: error.message, allowedByRule, options: [] as CourtesyOption[] };

  const products = (data ?? []) as ProductRow[];
  const byRole = new Map<CourtesyRole, ProductRow[]>();
  for (const product of products) {
    const role = product.courtesy_role;
    if (!role) continue;
    const list = byRole.get(role) ?? [];
    list.push(product);
    byRole.set(role, list);
  }

  const options: CourtesyOption[] = [];
  for (const type of allowedByRule) {
    if (type === "coffee_keke" || type === "cappuccino_keke") {
      const drinkRole = type === "coffee_keke" ? "coffee" : "cappuccino";
      const drink = firstAvailable(byRole.get(drinkRole), branchId);
      const keke = firstAvailable(byRole.get("keke"), branchId);
      const disabledReason = !drink ? `El combo no esta disponible porque falta stock de ${courtesyTypeLabel(drinkRole)}.` : !keke ? "El combo no esta disponible porque falta stock de keke." : undefined;
      options.push({
        kind: "combo",
        comboType: type,
        label: drink && keke ? `${drink.name} + ${keke.name}` : courtesyTypeLabel(type),
        items: [drink ? toComboItem(drink, drinkRole, branchId) : null, keke ? toComboItem(keke, "keke", branchId) : null].filter(Boolean) as any,
        available: Boolean(drink && keke),
        disabledReason
      });
      continue;
    }

    const rows = byRole.get(type) ?? [];
    if (!rows.length) {
      options.push({ kind: "single", role: type, label: courtesyTypeLabel(type), productId: "", productName: "Sin producto configurado", stockCurrent: 0, available: false, disabledReason: "No hay productos disponibles para esta cortesia." });
      continue;
    }
    for (const product of rows) {
      const stockCurrent = stockFor(product, branchId);
      options.push({
        kind: "single",
        role: type,
        label: product.courtesy_label ?? courtesyTypeLabel(type),
        productId: product.id,
        productName: product.name,
        stockCurrent,
        available: stockCurrent > 0,
        disabledReason: stockCurrent > 0 ? undefined : "No hay stock suficiente para entregar esta cortesia."
      });
    }
  }

  return { allowedByRule, options };
}

export async function validateAndApplyCourtesy({
  admin,
  branchId,
  serviceOrderId,
  employeeUserId,
  selection,
  servicePrice,
  orderTotal
}: {
  admin: AdminClient;
  branchId: string;
  serviceOrderId: string;
  employeeUserId?: string | null;
  selection: CourtesySelection;
  servicePrice?: number;
  orderTotal?: number;
}) {
  const resolved = await resolveCourtesyProducts({ admin, branchId, servicePrice, orderTotal });
  if (resolved.error) return { error: resolved.error };
  const allowed = new Set(resolved.allowedByRule);
  const rows = selection.kind === "single"
    ? [{ role: selection.role, productId: selection.productId, groupLabel: courtesyTypeLabel(selection.role), groupId: null as string | null }]
    : selection.items.map((item) => ({ ...item, groupLabel: "", groupId: "" }));

  if (selection.kind === "single" && !allowed.has(selection.role)) return { error: "La cortesia seleccionada ya no esta disponible. Elige otra opcion." };
  if (selection.kind === "combo" && !allowed.has(selection.comboType)) return { error: "La cortesia seleccionada ya no esta disponible. Elige otra opcion." };
  if (selection.kind === "combo") {
    const required = selection.comboType === "coffee_keke" ? ["coffee", "keke"] : ["cappuccino", "keke"];
    const got = selection.items.map((item) => item.role).sort().join(",");
    if (got !== required.sort().join(",")) return { error: "Combo de cortesia invalido." };
  }

  const productIds = rows.map((row) => row.productId);
  const { data: products, error } = await admin
    .from("products")
    .select("id,name,branch_id,is_active,courtesy_enabled,courtesy_role,tracks_stock,product_branch_stock(branch_id,stock_current)")
    .in("id", productIds);
  if (error) return { error: error.message };

  const groupId = selection.kind === "combo" ? randomUUID() : null;
  const groupLabel = selection.kind === "combo"
    ? rows.map((row) => products?.find((product: any) => product.id === row.productId)?.name).filter(Boolean).join(" + ")
    : rows[0]?.groupLabel ?? "Cortesia";

  const validatedRows = [];
  for (const row of rows) {
    const product = (products ?? []).find((item: any) => item.id === row.productId) as any;
    if (!product?.is_active || !product.courtesy_enabled) return { error: "El producto seleccionado no esta configurado como cortesia." };
    if (product.branch_id && product.branch_id !== branchId) return { error: "Producto de cortesia fuera de sede." };
    if (product.courtesy_role !== row.role) return { error: "El producto seleccionado no corresponde al tipo de cortesia." };
    const previousStock = stockFor(product, branchId);
    if (previousStock < 1) return { error: "No hay stock suficiente para entregar esta cortesia." };
    validatedRows.push({ row, product, previousStock });
  }

  const insertedItemIds: string[] = [];
  for (const { row, product, previousStock } of validatedRows) {
    const { data: item, error: itemError } = await admin.from("service_order_items").insert({
      service_order_id: serviceOrderId,
      item_type: "courtesy",
      product_id: product.id,
      name: product.name,
      description: `Cortesia: ${selection.kind === "combo" ? groupLabel : product.name}`,
      quantity: 1,
      unit_price: 0,
      amount: 0,
      subtotal: 0,
      line_total: 0,
      discount_amount: 0,
      seller_credit_amount: 0,
      counts_for_seller_credit: false,
      branch_id: branchId,
      courtesy_type: selection.kind === "combo" ? selection.comboType : row.role,
      courtesy_role: row.role,
      courtesy_group_id: groupId,
      courtesy_group_label: selection.kind === "combo" ? groupLabel : null,
      stock_controlled: true
    }).select("id").single();
    if (itemError || !item) return { error: itemError?.message ?? "No se pudo guardar cortesia" };

    const newStock = previousStock - 1;
    await admin.from("product_branch_stock").update({ stock_current: newStock, updated_at: new Date().toISOString() }).eq("product_id", product.id).eq("branch_id", branchId);
    await admin.from("product_stock_movements").insert({
      product_id: product.id,
      branch_id: branchId,
      service_order_id: serviceOrderId,
      service_order_item_id: item.id,
      movement_type: "sale",
      movement_kind: "cortesia",
      quantity: 1,
      quantity_delta: -1,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: "Salida por cortesia",
      created_by: employeeUserId ?? null,
      actor_user_id: employeeUserId ?? null,
      metadata: { courtesy_group_id: groupId, courtesy_group_label: groupLabel, courtesy_role: row.role }
    });
    insertedItemIds.push(item.id);
  }

  return { ok: true, itemIds: insertedItemIds, groupId, groupLabel };
}

export async function restoreCourtesyStockForOrder(admin: AdminClient, serviceOrderId: string, branchId: string, actorUserId?: string | null, reason = "Atencion anulada") {
  const { data: items, error } = await admin
    .from("service_order_items")
    .select("id,product_id,quantity,courtesy_role,courtesy_group_id,courtesy_group_label")
    .eq("service_order_id", serviceOrderId)
    .eq("item_type", "courtesy")
    .eq("stock_controlled", true);
  if (error) return { error: error.message };

  for (const item of (items ?? []) as any[]) {
    if (!item.product_id) continue;
    const quantity = Math.trunc(Number(item.quantity ?? 1));
    const { data: branchStock } = await admin.from("product_branch_stock").select("stock_current").eq("product_id", item.product_id).eq("branch_id", branchId).maybeSingle();
    const previousStock = Number(branchStock?.stock_current ?? 0);
    const newStock = previousStock + quantity;
    await admin.from("product_branch_stock").update({ stock_current: newStock, updated_at: new Date().toISOString() }).eq("product_id", item.product_id).eq("branch_id", branchId);
    await admin.from("product_stock_movements").insert({
      product_id: item.product_id,
      branch_id: branchId,
      service_order_id: serviceOrderId,
      service_order_item_id: item.id,
      movement_type: "void",
      movement_kind: "anulacion_cortesia",
      quantity,
      quantity_delta: quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason,
      created_by: actorUserId ?? null,
      actor_user_id: actorUserId ?? null,
      metadata: { courtesy_group_id: item.courtesy_group_id, courtesy_group_label: item.courtesy_group_label, courtesy_role: item.courtesy_role }
    });
  }
  return { ok: true, restored: items?.length ?? 0 };
}

function comboRoles(type: CourtesyType): CourtesyRole[] {
  if (type === "coffee_keke") return ["coffee", "keke"];
  if (type === "cappuccino_keke") return ["cappuccino", "keke"];
  return [type];
}

function firstAvailable(products: ProductRow[] | undefined, branchId: string) {
  return (products ?? []).find((product) => stockFor(product, branchId) > 0) ?? null;
}

function toComboItem(product: ProductRow, role: CourtesyRole, branchId: string) {
  return { role, productId: product.id, productName: product.name, stockCurrent: stockFor(product, branchId) };
}

function stockFor(product: ProductRow, branchId: string) {
  if (product.tracks_stock === false) return Number.MAX_SAFE_INTEGER;
  return Number(product.product_branch_stock?.find((row) => row.branch_id === branchId)?.stock_current ?? 0);
}

function normalizeMoney(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
