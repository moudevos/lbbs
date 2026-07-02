import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCourtesyProducts } from "@/lib/courtesies/resolve-courtesy-products";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return NextResponse.json({ error: "Token local requerido" }, { status: 401 });
  const admin = createAdminClient();
  const { data: device, error } = await admin
    .from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (error || !device) return NextResponse.json({ error: "Token local invalido" }, { status: 403 });

  const servicePrice = Number(request.nextUrl.searchParams.get("service_price") ?? 0);
  const orderTotal = Number(request.nextUrl.searchParams.get("order_total") ?? servicePrice);
  const result = await resolveCourtesyProducts({ admin, branchId: device.branch_id, servicePrice, orderTotal });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({
    ok: true,
    allowedByRule: result.allowedByRule,
    options: result.options,
    message: result.options.length === 0 ? "No hay stock disponible para las cortesias permitidas." : undefined
  });
}
