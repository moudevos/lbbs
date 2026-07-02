import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveCourtesyProducts } from "@/lib/courtesies/resolve-courtesy-products";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const requestedBranchId = request.nextUrl.searchParams.get("branch_id") ?? "";
  const branchId = context.employee.role === "admin" ? requestedBranchId : context.employee.branchId ?? "";
  if (!branchId || branchId === "all") return NextResponse.json({ error: "Sede requerida" }, { status: 400 });

  const servicePrice = Number(request.nextUrl.searchParams.get("service_price") ?? 0);
  const orderTotal = Number(request.nextUrl.searchParams.get("order_total") ?? servicePrice);
  const result = await resolveCourtesyProducts({ admin: context.admin, branchId, servicePrice, orderTotal });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({
    ok: true,
    allowedByRule: result.allowedByRule,
    options: result.options,
    message: result.options.length === 0 ? "No hay stock disponible para las cortesias permitidas." : undefined
  });
}
