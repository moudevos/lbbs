export function BranchBadge({ branch }: { branch: string | null | undefined }) {
  return <span className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">{branch ?? "Global"}</span>;
}
