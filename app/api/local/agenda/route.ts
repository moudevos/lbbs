import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateRangeForDay } from "@/lib/reservations/time";
import { mapReservation } from "@/lib/reservations/mapper";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? request.nextUrl.searchParams.get("token") ?? "";
  if (!token) return { error: NextResponse.json({ error: "Token local requerido" }, { status: 401 }) };
  const admin = createAdminClient();
  let { data, error } = await admin
    .from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) {
    const legacy = await admin
      .from("local_device_tokens")
      .select("id,branch_id,is_active")
      .eq("token_hash", hash(token))
      .eq("is_active", true)
      .maybeSingle();
    data = legacy.data as any;
    error = legacy.error;
  }
  if (error || !data) return { error: NextResponse.json({ error: "Token local invalido" }, { status: 403 }) };
  await admin.from("local_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { admin, token: data };
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const range = dateRangeForDay(date);
  const [{ data: reservations, error }, { data: barbers }, { data: services }, { data: products }, { data: templates }] = await Promise.all([
    auth.admin
      .from("reservations")
      .select("id,status,source,branch_id,service_id,employee_id,starts_at,ends_at,price,observations,branches(name,phone),customers(full_name,phone),services(name),employees(first_name,last_name),service_orders(id)")
      .eq("branch_id", auth.token.branch_id)
      .eq("status", "confirmado")
      .gte("starts_at", range.from)
      .lte("starts_at", range.to)
      .order("starts_at"),
    auth.admin.from("employees").select("id,first_name,last_name,branch_id,role,can_perform_services").eq("branch_id", auth.token.branch_id).eq("is_active", true).or("role.eq.barbero,can_perform_services.eq.true").order("first_name"),
    auth.admin.from("services").select("id,sku,name,price,duration_minutes,branch_id").eq("is_active", true).or(`branch_id.is.null,branch_id.eq.${auth.token.branch_id}`).order("name"),
    auth.admin.from("products").select("id,name,sku,sale_price,branch_id,category,counts_for_seller_credit,seller_credit_amount,product_branch_stock(branch_id,stock_current)").eq("is_active", true).or(`branch_id.is.null,branch_id.eq.${auth.token.branch_id}`).order("name"),
    auth.admin.from("whatsapp_templates").select("key,body")
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const templateMap = Object.fromEntries((templates ?? []).map((item) => [item.key, item.body]));
  return NextResponse.json({
    branchId: auth.token.branch_id,
    reservations: (reservations ?? []).map((reservation) => mapReservation(reservation as never, templateMap.primer_contacto, templateMap)),
    barbers: (barbers ?? []).map((barber) => ({ id: barber.id, name: `${barber.first_name} ${barber.last_name}`.trim(), branchId: barber.branch_id })),
    services: (services ?? []).map((service) => ({ id: service.id, sku: service.sku, name: service.name, price: service.price, durationMinutes: service.duration_minutes, branchId: service.branch_id })),
    products: products ?? []
  });
}
