import type { CurrentEmployee } from "@/lib/auth/types";

export type BranchScope = { mode: "all"; branchId: null } | { mode: "branch"; branchId: string };

export function resolveBranchScope(employee: CurrentEmployee, requestedBranchId?: string | null): BranchScope {
  if (employee.role === "admin") {
    if (!requestedBranchId || requestedBranchId === "all") return { mode: "all", branchId: null };
    return { mode: "branch", branchId: requestedBranchId };
  }

  if (!employee.branchId) return { mode: "all", branchId: null };
  return { mode: "branch", branchId: employee.branchId };
}
