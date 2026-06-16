import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentEmployee } from "@/lib/auth/types";

type ControlContext =
  | { ok: false; error: NextResponse }
  | { ok: true; employee: CurrentEmployee; admin: ReturnType<typeof createAdminClient> };

export async function requireEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee || !employee.isActive) {
    return { ok: false, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) } satisfies ControlContext;
  }
  return { ok: true, employee, admin: createAdminClient() } satisfies ControlContext;
}

export async function requireAdmin() {
  const context = await requireEmployee();
  if (!context.ok) return context;
  if (context.employee.role !== "admin") {
    return { ok: false, error: NextResponse.json({ error: "Solo admin" }, { status: 403 }) } satisfies ControlContext;
  }
  return context;
}

export function canSeeBranch(employee: CurrentEmployee, branchId: string | null) {
  return employee.role === "admin" || !branchId || employee.branchId === branchId;
}
