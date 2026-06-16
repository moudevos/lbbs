export function LoadingState() {
  return <p className="text-sm text-[var(--text-muted)]">Cargando...</p>;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 px-5 py-4 text-sm text-[var(--text-muted)]">
        Cargando modulo...
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-lg border border-[var(--border-soft)] bg-white/5" />
      ))}
    </div>
  );
}

export function FormLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/70 text-sm text-[var(--text-muted)]">Guardando...</div>;
}

export function ButtonSpinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />;
}
