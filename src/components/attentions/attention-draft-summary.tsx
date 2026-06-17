export function AttentionDraftSummary({ total, itemsCount }: { total: number; itemsCount: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">Borrador en memoria</span>
        <span className="text-xs text-[var(--gold-soft)]">{itemsCount} item(s)</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">Total atención</span>
        <strong className="text-2xl text-[var(--gold)]">S/ {total.toFixed(2)}</strong>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">No se crea atención, stock, producción ni auditoría hasta guardar.</p>
    </div>
  );
}
