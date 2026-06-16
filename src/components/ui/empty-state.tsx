export function EmptyState({ message = "No hay registros." }: { message?: string }) {
  return <div className="rounded-lg border border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">{message}</div>;
}
