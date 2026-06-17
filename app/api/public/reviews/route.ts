import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/customers/phone";
import { dedupeById } from "@/lib/utils/dedupe-by-id";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customer_reviews")
    .select("id,display_name,rating,comment,is_anonymous,created_at,branches(name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reviews: dedupeById(data ?? []).slice(0, 10).map((review) => {
      const branch = Array.isArray(review.branches) ? review.branches[0] : review.branches;
      return {
        id: review.id,
        name: review.is_anonymous ? "Cliente La Bajadita" : review.display_name || "Cliente La Bajadita",
        rating: review.rating,
        comment: review.comment,
        branchName: branch?.name ?? null,
        createdAt: review.created_at
      };
    })
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rating = Number(body.rating ?? 0);
  const comment = String(body.comment ?? "").trim();

  if (!rating || rating < 1 || rating > 5 || !comment) {
    return NextResponse.json({ error: "Calificacion y comentario son requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const phone = body.phone ? normalizePhone(String(body.phone)) : null;
  const { data, error } = await admin
    .from("customer_reviews")
    .insert({
      display_name: body.displayName ? String(body.displayName).trim() : null,
      phone,
      rating,
      comment,
      is_anonymous: Boolean(body.isAnonymous),
      source: "public",
      status: "pending",
      branch_id: body.branchId || null
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviewId: data.id, status: "pending" });
}
