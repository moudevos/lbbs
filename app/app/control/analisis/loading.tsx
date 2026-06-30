export default function LoadingAnalisis() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)]" />)}</div>;
}
