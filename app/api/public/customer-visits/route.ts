import { NextResponse, type NextRequest } from "next/server";
import { normalizePhone } from "@/lib/customers/phone";
import { createAdminClient } from "@/lib/supabase/admin";

type VisitReservationRow = {
  id: string;
  starts_at: string;
  status: string;
  services?: { name: string | null } | { name: string | null }[] | null;
  branches?: { name: string | null } | { name: string | null }[] | null;
};

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone") ?? "";
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Celular requerido" }, { status: 400 });
  }

  const admin = createAdminClient();
  let customerResult = await admin
    .from("customers")
    .select("id,full_name")
    .eq("normalized_phone", normalizedPhone)
    .maybeSingle();

  if (customerResult.error) {
    customerResult = await admin
      .from("customers")
      .select("id,full_name")
      .eq("phone", phone)
      .maybeSingle();
  }

  const { data: customer, error } = customerResult;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!customer) return NextResponse.json({ found: false });

  const statsResult = await admin
    .from("customer_visit_stats")
    .select("total_visits,last_visit_at,total_attended_reservations")
    .eq("customer_id", customer.id)
    .maybeSingle();

  const { data: reservations, error: reservationsError } = await admin
    .from("reservations")
    .select("id,starts_at,status,services(name),branches(name)")
    .eq("customer_id", customer.id)
    .eq("status", "atendido")
    .order("starts_at", { ascending: false })
    .limit(10);

  if (reservationsError) return NextResponse.json({ error: reservationsError.message }, { status: 500 });

  const stats = statsResult.error ? null : statsResult.data;

  return NextResponse.json({
    found: true,
    customer: {
      name: customer.full_name,
      totalVisits: stats?.total_visits ?? 0,
      totalAttendedReservations: stats?.total_attended_reservations ?? 0,
      lastVisitAt: stats?.last_visit_at ?? null
    },
    history: ((reservations ?? []) as VisitReservationRow[]).map((reservation) => ({
      id: reservation.id,
      date: reservation.starts_at,
      status: reservation.status,
      service: Array.isArray(reservation.services) ? reservation.services[0]?.name : reservation.services?.name,
      branch: Array.isArray(reservation.branches) ? reservation.branches[0]?.name : reservation.branches?.name
    }))
  });
}
