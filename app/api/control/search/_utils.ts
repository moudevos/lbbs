import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export type SearchItem = {
  id: string;
  label: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
};

export async function searchContext(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return { response: context.error };
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return { response: NextResponse.json({ ok: true, items: [] }) };
  const requestedBranchId = request.nextUrl.searchParams.get("branch_id") ?? "";
  const branchId = context.employee.role === "admin" ? requestedBranchId : context.employee.branchId ?? "";
  return { context, q, branchId };
}

export function searchResponse(items: SearchItem[]) {
  return NextResponse.json({ ok: true, items: items.slice(0, 20) });
}

export function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
