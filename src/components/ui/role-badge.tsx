export function RoleBadge({ role }: { role: string }) {
  return <span className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">{role}</span>;
}
