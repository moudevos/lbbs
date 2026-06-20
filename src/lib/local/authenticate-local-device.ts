import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function authenticateLocalDevice(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return { error: NextResponse.json({ error: "Token local requerido" }, { status: 401 }) };
  const admin = createAdminClient();
  const current = await admin.from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (current.data) return { admin, device: current.data };

  const legacy = await admin.from("local_device_tokens")
    .select("id,branch_id,is_active")
    .eq("token_hash", hash(token))
    .eq("is_active", true)
    .maybeSingle();
  if (!legacy.data) return { error: NextResponse.json({ error: "Token local invalido" }, { status: 403 }) };
  return { admin, device: legacy.data };
}
