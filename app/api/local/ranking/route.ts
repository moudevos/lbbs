import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? request.nextUrl.searchParams.get("token") ?? "";
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

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await auth.admin
    .from("service_order_items")
    .select("barber_id,service_orders!inner(branch_id,service_date,status),employees!service_order_items_barber_id_fkey(first_name,last_name)")
    .eq("item_type", "service")
    .eq("service_orders.branch_id", auth.device.branch_id)
    .eq("service_orders.service_date", date)
    .neq("service_orders.status", "anulado");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ranking = new Map<string, { employeeId: string; name: string; servicesCount: number }>();
  for (const item of data ?? []) {
    if (!item.barber_id) continue;
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const current = ranking.get(item.barber_id) ?? {
      employeeId: item.barber_id,
      name: `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() || "Sin nombre",
      servicesCount: 0
    };
    current.servicesCount += 1;
    ranking.set(item.barber_id, current);
  }

  return NextResponse.json({ date, ranking: Array.from(ranking.values()).sort((a, b) => b.servicesCount - a.servicesCount) });
}
