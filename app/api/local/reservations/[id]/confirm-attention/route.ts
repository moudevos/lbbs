import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { convertReservationToServiceOrder } from "@/lib/service-orders/server";
import { writeAuditLog } from "@/lib/audit";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return NextResponse.json({ error: "Token local requerido" }, { status: 401 });
  const admin = createAdminClient();
  let { data: device } = await admin.from("local_devices").select("id,branch_id").eq("access_token_hash", hash(token)).eq("status", "active").maybeSingle();
  if (!device) {
    const legacy = await admin.from("local_device_tokens").select("id,branch_id").eq("token_hash", hash(token)).eq("is_active", true).maybeSingle();
    device = legacy.data;
  }
  if (!device) return NextResponse.json({ error: "Token local invalido" }, { status: 403 });
  const body = await request.json().catch(() => ({}));

  const { data: reservation, error } = await admin.from("reservations").select("id,branch_id,employee_id,status").eq("id", params.id).maybeSingle();
  if (error || !reservation) return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });
  if (reservation.branch_id !== device.branch_id) return NextResponse.json({ error: "Reserva fuera de sede local" }, { status: 403 });
  if (reservation.status !== "confirmado") return NextResponse.json({ error: "El dispositivo solo puede confirmar reservas confirmadas" }, { status: 400 });

  if (!reservation.employee_id && !body.barberId) return NextResponse.json({ error: "Barbero requerido" }, { status: 400 });
  if (body.barberId) await admin.from("reservations").update({ employee_id: body.barberId }).eq("id", params.id);
  await admin.from("reservations").update({ status: "atendido" }).eq("id", params.id);
  const result = await convertReservationToServiceOrder(admin, params.id);
  if (result.error || !result.serviceOrderId) return NextResponse.json({ error: result.error ?? "No se pudo crear atencion" }, { status: 500 });
  await admin.from("service_orders").update({ origin: "local_device", status: "pendiente_pago" }).eq("id", result.serviceOrderId);

  await writeAuditLog(admin, {
    eventType: "create",
    tableName: "service_orders",
    recordId: result.serviceOrderId,
    newData: { source: "local_device", reservation_id: params.id, device_id: device.id, barber_id: body.barberId ?? reservation.employee_id, status: "pendiente_pago" }
  });
  return NextResponse.json({ serviceOrderId: result.serviceOrderId, redirectTo: `/local/atenciones/${result.serviceOrderId}` });
}
