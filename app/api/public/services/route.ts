import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dedupeById } from "@/lib/utils/dedupe-by-id";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  const admin = createAdminClient();
  let query = admin
    .from("services")
    .select("id,sku,name,description,duration_minutes,price,branch_id,image_path,branches(name)")
    .eq("is_active", true)
    .order("name");

  if (branchId) query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    services: dedupeById(data ?? []).map((service) => {
      const branch = Array.isArray(service.branches) ? service.branches[0] : service.branches;
      return {
        id: service.id,
        sku: service.sku,
        name: service.name,
        description: service.description,
        durationMinutes: service.duration_minutes,
        price: service.price,
        branchId: service.branch_id,
        branchName: branch?.name ?? null,
        imagePath: service.image_path ?? null
      };
    })
  });
}
