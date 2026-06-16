import type { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-[var(--border-soft)]">{children}</div>;
}
