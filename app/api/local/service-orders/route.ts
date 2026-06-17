import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";
import { createServiceOrder, missingAttentionItemsMessage, normalizeMoney } from "@/lib/service-orders/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return { error: NextResponse.json({ error: "Token local requerido" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: "Token local invalido" }, { status: 403 }) };
  await admin.from("local_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { admin, device: data };
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const hasService = Boolean(body.serviceId);
  const hasAdditions = Array.isArray(body.additions) && body.additions.some((item: any) => item.name && Number(item.amount) > 0);
  const hasProducts = Array.isArray(body.productItems) && body.productItems.length > 0;

  if (!body.customerPhone || !body.customerName || !body.employeeId) {
    return NextResponse.json({ error: "Cliente y barbero son requeridos" }, { status: 400 });
  }
  if (!hasService && !hasAdditions && !hasProducts) {
    return NextResponse.json({ error: missingAttentionItemsMessage }, { status: 400 });
  }
  if (!isValidPeruMobilePhone(body.customerPhone)) {
    return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  }

  const result = await createServiceOrder({
    admin: auth.admin,
    branchId: auth.device.branch_id,
    customerPhone: body.customerPhone,
    customerName: body.customerName,
    employeeId: body.employeeId,
    serviceId: body.serviceId || null,
    total: normalizeMoney(body.total),
    additions: body.additions ?? [],
    productItems: body.productItems ?? [],
    observations: body.observations ?? null,
    origin: "local_device",
    status: "pendiente_pago",
    serviceDate: new Date().toISOString().slice(0, 10)
  });

  if (result.error || !result.serviceOrderId) {
    return NextResponse.json({ error: result.error ?? "No se pudo registrar atencion local" }, { status: 500 });
  }

  await writeAuditLog(auth.admin, {
    eventType: "create",
    tableName: "service_orders",
    recordId: result.serviceOrderId,
    newData: {
      source: "local_device",
      device_id: auth.device.id,
      branch_id: auth.device.branch_id,
      customer_created: result.customerCreated
    }
  });

  return NextResponse.json({ serviceOrderId: result.serviceOrderId, redirectTo: `/local/atenciones/${result.serviceOrderId}` });
}
