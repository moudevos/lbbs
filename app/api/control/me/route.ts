import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  return NextResponse.json({ employee: context.employee });
}
