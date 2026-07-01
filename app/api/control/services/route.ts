import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { writeAuditLog } from "@/lib/audit";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  let query = context.admin
    .from("services")
    .select("id,sku,name,description,duration_minutes,price,branch_id,is_active,branches(name)")
    .order("sku");
  const scope = resolveBranchScope(context.employee, branchId);
  if (context.employee.role === "admin" && scope.mode === "branch") {
    query = query.or(`branch_id.is.null,branch_id.eq.${scope.branchId}`);
  } else if (context.employee.role !== "admin") {
    query = query.or(`branch_id.is.null,branch_id.eq.${context.employee.branchId}`);
  }
  if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  const body = await request.json();
  if (!body.name || !body.durationMinutes) return NextResponse.json({ error: "Nombre y duracion requeridos" }, { status: 400 });
  const price = body.price === "" || body.price == null ? null : Number(body.price);
  if (Number(body.durationMinutes) <= 0 || (price != null && (!Number.isFinite(price) || price < 0))) return NextResponse.json({ error: "Duracion o precio invalido" }, { status: 400 });
  if (price == null) return NextResponse.json({ error: "Precio requerido para servicios normales" }, { status: 400 });
  const sku = await nextCode(context.admin, "services", "sku", "SRV", 4);
  const payload = {
    sku,
    name: body.name,
    description: body.description ?? null,
    duration_minutes: Number(body.durationMinutes),
    price: price.toFixed(2),
    branch_id: body.branchId || null,
    is_active: true
  };
  const { data, error } = await context.admin.from("services").insert(payload).select("id,sku").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "services",
    recordId: data.id,
    newData: payload
  });
  return NextResponse.json({ service: data });
}
