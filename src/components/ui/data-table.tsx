import type { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="control-table-wrap w-full max-w-full overflow-x-auto rounded-2xl border border-[var(--control-border)]">{children}</div>;
}
