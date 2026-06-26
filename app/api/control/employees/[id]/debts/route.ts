import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { getEmployeeDebtSummary } from "@/lib/liquidations/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  try {
    const summary = await getEmployeeDebtSummary(context.admin, { employeeId: params.id });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar deudas" }, { status: 500 });
  }
}
