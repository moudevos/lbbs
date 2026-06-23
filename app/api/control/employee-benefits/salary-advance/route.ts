import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { createBenefitMovement } from "@/lib/employee-benefits/server";
export async function POST(request: NextRequest) {
  const context = await requireEmployee(); if (!context.ok) return context.error;
  const result = await createBenefitMovement({ admin: context.admin, actor: context.employee, type: "salary_advance", body: await request.json() });
  return NextResponse.json(result.error ? { error: result.error } : result, { status: result.status });
}
