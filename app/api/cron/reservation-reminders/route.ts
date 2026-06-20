import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date();
  const until = new Date(now.getTime() + 25 * 60_000);
  const from = new Date(now.getTime() + 15 * 60_000);
  const { data: reservations, error } = await admin.from("reservations")
    .select("id,branch_id,starts_at,status,customers(full_name),services(name),employees(first_name,last_name)")
    .eq("status", "confirmado").gte("starts_at", from.toISOString()).lte("starts_at", until.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0;
  for (const reservation of reservations ?? []) {
    const { data: reminder } = await admin.from("reservation_reminders").select("id,status").eq("reservation_id", reservation.id).maybeSingle();
    if (reminder?.status === "sent") continue;
    const customer = Array.isArray(reservation.customers) ? reservation.customers[0] : reservation.customers;
    const service = Array.isArray(reservation.services) ? reservation.services[0] : reservation.services;
    await admin.rpc("create_operational_notification", {
      p_branch_id: reservation.branch_id, p_type: "reservation.reminder",
      p_title: "Reserva en 20 minutos",
      p_body: `Cliente: ${customer?.full_name ?? "Cliente"} · Servicio: ${service?.name ?? "Servicio"}`,
      p_target_type: "reservation", p_target_id: reservation.id,
      p_url: "/app/control/agenda", p_payload: { starts_at: reservation.starts_at }
    });
    await admin.from("reservation_reminders").upsert({
      reservation_id: reservation.id, branch_id: reservation.branch_id,
      remind_at: from.toISOString(), sent_at: new Date().toISOString(), status: "sent"
    }, { onConflict: "reservation_id" });
    sent += 1;
  }
  return NextResponse.json({ ok: true, sent, pushConfigured: Boolean(process.env.VAPID_PRIVATE_KEY) });
}
