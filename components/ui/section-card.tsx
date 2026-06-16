import type { ReactNode } from "react";

export function SectionCard({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="glass-panel gold-border rounded-3xl p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
