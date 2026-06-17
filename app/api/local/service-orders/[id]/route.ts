import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return NextResponse.json({ error: "Token local requerido" }, { status: 401 });
  const admin = createAdminClient();
  const { data: device, error: deviceError } = await admin
    .from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (deviceError || !device) return NextResponse.json({ error: "Token local invalido" }, { status: 403 });

  const { data, error } = await admin
    .from("service_orders")
    .select("id,status,origin,subtotal,total,total_paid,balance,discount_amount,service_date,attended_at,created_at,branches(id,name),customers(full_name,phone),employees(first_name,last_name),services(name),service_order_items(id,item_type,name,description,quantity,unit_price,subtotal,products(name,sku))")
    .eq("id", params.id)
    .eq("branch_id", device.branch_id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Atencion no encontrada" }, { status: 404 });
  await admin.from("local_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  return NextResponse.json({ serviceOrder: data });
}
