import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/customers/phone";
import { dateRangeForDay, overlaps } from "@/lib/reservations/time";
import { syncRewardAccount } from "@/lib/rewards/server";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

type AdminClient = SupabaseClient<any, "public", any>;
type CustomerLookupRow = {
  id: string;
  full_name: string;
  phone: string | null;
  normalized_phone: string | null;
  branch_id: string | null;
};

export async function findOrCreateCustomerByPhone({
  admin,
  phone,
  fullName,
  branchId
}: {
  admin: AdminClient;
  phone: string;
  fullName: string;
  branchId: string;
}) {
  const normalizedPhone = normalizePhone(phone);
  const customerSelect = "id,full_name,phone,normalized_phone,branch_id";
  const { data: normalizedMatches, error: existingError } = await admin
    .from("customers")
    .select(customerSelect)
    .eq("normalized_phone", normalizedPhone)
    .limit(1);

  if (existingError) {
    return { error: existingError.message };
  }

  let existing: CustomerLookupRow | null = normalizedMatches?.[0] ?? null;

  // Older customer rows may predate normalized_phone. Reuse them instead of
  // creating a duplicate when the public reservation uses the same phone.
  if (!existing) {
    const { data: legacyCandidates, error: legacyError } = await admin
      .from("customers")
      .select(customerSelect)
      .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`)
      .limit(10);

    if (legacyError) return { error: legacyError.message };

    existing =
      legacyCandidates?.find((customer) => normalizePhone(customer.phone ?? "") === normalizedPhone) ??
      null;

    if (existing && existing.normalized_phone !== normalizedPhone) {
      const { error: normalizeError } = await admin
        .from("customers")
        .update({ normalized_phone: normalizedPhone })
        .eq("id", existing.id);

      if (normalizeError && normalizeError.code !== "23505") {
        return { error: normalizeError.message };
      }
    }
  }

  if (existing) {
    return {
      customer: existing,
      created: false,
      normalizedPhone,
      nameDiffers: existing.full_name.trim().toLowerCase() !== fullName.trim().toLowerCase()
    };
  }

  const { data: created, error: createError } = await admin
    .from("customers")
    .insert({ full_name: fullName, phone, normalized_phone: normalizedPhone, branch_id: branchId })
    .select(customerSelect)
    .single();

  if (createError) {
    // The unique normalized-phone index can win a race between two requests.
    // Resolve the existing customer instead of returning an avoidable error.
    if (createError.code === "23505") {
      const { data: concurrentCustomer, error: concurrentError } = await admin
        .from("customers")
        .select(customerSelect)
        .eq("normalized_phone", normalizedPhone)
        .maybeSingle();

      if (concurrentError || !concurrentCustomer) {
        return { error: concurrentError?.message ?? createError.message };
      }

      return {
        customer: concurrentCustomer,
        created: false,
        normalizedPhone,
        nameDiffers: concurrentCustomer.full_name.trim().toLowerCase() !== fullName.trim().toLowerCase()
      };
    }

    return { error: createError.message };
  }

  return { customer: created, created: true, normalizedPhone, nameDiffers: false };
}

export async function assertReservationCanBeConfirmed({
  admin,
  reservationId,
  employeeId,
  startsAt,
  endsAt,
  price
}: {
  admin: AdminClient;
  reservationId?: string;
  employeeId: string | null | undefined;
  startsAt: Date;
  endsAt: Date;
  price?: number | null;
}) {
  if (!employeeId) {
    return null;
  }

  const range = dateRangeForDay(startsAt.toISOString().slice(0, 10));
  let query = admin
    .from("reservations")
    .select("id,starts_at,ends_at")
    .eq("employee_id", employeeId)
    .eq("status", "confirmado")
    .gte("starts_at", range.from)
    .lte("starts_at", range.to);

  if (reservationId) query = query.neq("id", reservationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const blocked = (data ?? []).some((reservation) =>
    overlaps(startsAt, endsAt, new Date(reservation.starts_at), new Date(reservation.ends_at))
  );

  return blocked ? NextResponse.json({ error: "No se puede confirmar: existe solapamiento para el barbero" }, { status: 409 }) : null;
}

export async function countReservationVisitOnce(admin: AdminClient, reservationId: string) {
  const { data: reservation, error } = await admin
    .from("reservations")
    .select("id,customer_id,starts_at,visit_counted_at")
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !reservation || !reservation.customer_id || reservation.visit_counted_at) {
    return { counted: false, error: error?.message };
  }
  const { data: customer } = await admin.from("customers").select("phone,normalized_phone").eq("id", reservation.customer_id).maybeSingle();
  if (isGenericCustomerPhone(customer?.normalized_phone ?? customer?.phone)) {
    return { counted: false, error: "Cliente generico no participa en rewards." };
  }

  const now = new Date().toISOString();
  const { data: stats } = await admin
    .from("customer_visit_stats")
    .select("customer_id,total_attended_reservations,total_service_orders")
    .eq("customer_id", reservation.customer_id)
    .maybeSingle();

  const attended = Number(stats?.total_attended_reservations ?? 0) + 1;
  const orders = Number(stats?.total_service_orders ?? 0);

  const { error: upsertError } = await admin.from("customer_visit_stats").upsert(
    {
      customer_id: reservation.customer_id,
      total_attended_reservations: attended,
      total_service_orders: orders,
      total_visits: attended + orders,
      last_visit_at: reservation.starts_at,
      updated_at: now
    },
    { onConflict: "customer_id" }
  );

  if (upsertError) return { counted: false, error: upsertError.message };

  const { error: updateError } = await admin
    .from("reservations")
    .update({ visit_counted_at: now })
    .eq("id", reservationId)
    .is("visit_counted_at", null);

  if (!updateError) await syncRewardAccount(admin, reservation.customer_id);
  return { counted: !updateError, error: updateError?.message };
}
