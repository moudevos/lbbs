import { NextResponse, type NextRequest } from "next/server";
import { normalizePhone, isValidPeruMobilePhone } from "@/lib/customers/phone";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedOrigins = [
  "https://labajaditabarberstudio.com",
  "https://reservas.labajaditabarberstudio.com"
];

const rateWindowMs = 60_000;
const maxAttemptsPerWindow = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

type HotspotPayload = {
  branchCode?: string;
  name?: string;
  phone?: string;
  acceptedTerms?: boolean;
  acceptedMarketing?: boolean;
  source?: string;
  mac?: string | null;
  ip?: string | null;
  username?: string | null;
  linkLoginOnly?: string | null;
  linkOrig?: string | null;
  userAgent?: string | null;
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as HotspotPayload | null;
  if (!body) return json(request, { error: "Payload invalido" }, 400);

  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const normalizedPhone = normalizePhone(String(body.phone ?? ""));
  const branchCode = String(body.branchCode ?? "").trim().toUpperCase();
  const requestIp = clientIp(request);
  const rateKey = `${requestIp}:${normalizedPhone || "no-phone"}`;
  if (!consumeRateLimit(rateKey)) return json(request, { error: "Demasiados intentos. Espera un minuto e intenta nuevamente." }, 429);

  if (name.length < 2) return json(request, { error: "Nombre obligatorio, minimo 2 caracteres" }, 400);
  if (!isValidPeruMobilePhone(normalizedPhone)) return json(request, { error: "WhatsApp debe tener 9 digitos y empezar con 9" }, 400);
  if (!branchCode) return json(request, { error: "Sede obligatoria" }, 400);
  if (body.acceptedTerms !== true) return json(request, { error: "Debes aceptar los terminos de uso del WiFi" }, 400);
  if (body.acceptedMarketing !== true) return json(request, { error: "Debes aceptar comunicaciones por WhatsApp o SMS" }, 400);

  const admin = createAdminClient();
  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id,code,name")
    .eq("code", branchCode)
    .eq("is_active", true)
    .maybeSingle();
  if (branchError) return json(request, { error: branchError.message }, 500);
  if (!branch) return json(request, { error: "Sede no encontrada o inactiva" }, 404);

  const now = new Date().toISOString();
  const existing = await findCustomer(admin, normalizedPhone);
  if (existing.error) return json(request, { error: existing.error }, 500);

  let customerId = existing.customer?.id ?? null;
  let createdCustomer = false;
  if (existing.customer) {
    const patch: Record<string, unknown> = {
      marketing_consent: true,
      marketing_consent_at: existing.customer.marketing_consent_at ?? now,
      terms_accepted_at: existing.customer.terms_accepted_at ?? now,
      is_active: true
    };
    if (shouldUpdateCustomerName(existing.customer.full_name)) patch.full_name = name;
    if (!existing.customer.branch_id) patch.branch_id = branch.id;
    const { error: updateError } = await admin.from("customers").update(patch).eq("id", existing.customer.id);
    if (updateError) return json(request, { error: updateError.message }, 500);
  } else {
    const { data: created, error: createError } = await admin
      .from("customers")
      .insert({
        full_name: name,
        phone: normalizedPhone,
        normalized_phone: normalizedPhone,
        branch_id: branch.id,
        marketing_consent: true,
        marketing_consent_at: now,
        terms_accepted_at: now
      })
      .select("id")
      .single();
    if (createError) {
      if (createError.code === "23505") {
        const retry = await findCustomer(admin, normalizedPhone);
        if (retry.error || !retry.customer) return json(request, { error: retry.error ?? createError.message }, 500);
        customerId = retry.customer.id;
      } else {
        return json(request, { error: createError.message }, 500);
      }
    } else {
      customerId = created.id;
      createdCustomer = true;
    }
  }

  const { data: visit, error: visitError } = await admin
    .from("hotspot_visits")
    .insert({
      branch_id: branch.id,
      customer_id: customerId,
      customer_name: name,
      phone: normalizedPhone,
      accepted_terms: true,
      accepted_marketing: true,
      source: String(body.source ?? "mikrotik_hotspot").slice(0, 80),
      mac_address: cleanOptional(body.mac),
      ip_address: cleanOptional(body.ip) ?? requestIp,
      mikrotik_username: cleanOptional(body.username),
      user_agent: cleanOptional(body.userAgent) ?? request.headers.get("user-agent"),
      metadata: {
        linkLoginOnly: cleanOptional(body.linkLoginOnly),
        linkOrig: cleanOptional(body.linkOrig),
        requestOrigin: request.headers.get("origin"),
        createdCustomer
      }
    })
    .select("id")
    .single();
  if (visitError) return json(request, { error: visitError.message }, 500);

  await notifyHotspotVisit(admin, {
    branchId: branch.id,
    visitId: visit.id,
    customerId,
    name,
    phone: normalizedPhone,
    branchName: branch.name,
    createdCustomer
  });

  return json(request, {
    ok: true,
    customerId,
    visitId: visit.id,
    message: "Visita registrada"
  });
}

function json(request: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(request) });
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function consumeRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + rateWindowMs });
    return true;
  }
  current.count += 1;
  return current.count <= maxAttemptsPerWindow;
}

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function cleanOptional(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text.includes("$(")) return null;
  return text.slice(0, 500);
}

function shouldUpdateCustomerName(name: string | null) {
  const normalized = String(name ?? "").trim().toLowerCase();
  return !normalized || normalized === "cliente" || normalized === "cliente generico" || normalized === "clientes vasrios" || normalized === "clientes varios";
}

async function findCustomer(admin: ReturnType<typeof createAdminClient>, normalizedPhone: string) {
  const select = "id,full_name,phone,normalized_phone,branch_id,marketing_consent_at,terms_accepted_at";
  const { data, error } = await admin
    .from("customers")
    .select(select)
    .eq("normalized_phone", normalizedPhone)
    .limit(1);
  if (error) return { error: error.message };
  if (data?.[0]) return { customer: data[0] as any };

  const { data: legacy, error: legacyError } = await admin
    .from("customers")
    .select(select)
    .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone}%`)
    .limit(10);
  if (legacyError) return { error: legacyError.message };
  const match = (legacy ?? []).find((customer) => normalizePhone(customer.phone ?? "") === normalizedPhone);
  if (match && match.normalized_phone !== normalizedPhone) {
    await admin.from("customers").update({ normalized_phone: normalizedPhone }).eq("id", match.id);
  }
  return { customer: match as any };
}

async function notifyHotspotVisit(
  admin: ReturnType<typeof createAdminClient>,
  input: { branchId: string; visitId: string; customerId: string | null; name: string; phone: string; branchName: string; createdCustomer: boolean }
) {
  const { error } = await admin.rpc("create_operational_notification", {
    p_branch_id: input.branchId,
    p_type: "hotspot.visit_registered",
    p_title: "Visita WiFi registrada",
    p_body: `${input.name} ingreso por hotspot en ${input.branchName}.`,
    p_target_type: "hotspot_visit",
    p_target_id: input.visitId,
    p_url: "/app/control/hotspot-visitas",
    p_payload: {
      customer_id: input.customerId,
      phone: input.phone,
      created_customer: input.createdCustomer
    }
  });
  if (error) {
    await admin.from("notification_events").insert({
      branch_id: input.branchId,
      type: "hotspot.visit_registered",
      title: "Visita WiFi registrada",
      body: `${input.name} ingreso por hotspot en ${input.branchName}.`,
      target_type: "hotspot_visit",
      target_id: input.visitId,
      url: "/app/control/hotspot-visitas",
      payload: { customer_id: input.customerId, phone: input.phone, created_customer: input.createdCustomer }
    });
  }
}
