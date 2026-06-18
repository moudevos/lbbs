import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { applyClassicCutReward } from "@/lib/rewards/server";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  const result = await applyClassicCutReward(context.admin, String(body.serviceOrderId ?? ""), context.employee.userId);
  return result.error ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json(result);
}

