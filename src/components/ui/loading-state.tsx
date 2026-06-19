export function LoadingState() {
  return <p className="text-sm text-[var(--text-muted)]">Cargando...</p>;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="control-card px-5 py-4 text-sm text-[var(--control-muted)]">
        Cargando modulo...
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)]" />
      ))}
    </div>
  );
}

export function CardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)]" />
      ))}
    </div>
  );
}

export function FormLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--control-bg)]/80 text-sm text-[var(--control-muted)] backdrop-blur-sm">Guardando...</div>;
}

export function ButtonSpinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" />;
}
