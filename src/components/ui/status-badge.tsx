export function StatusBadge({ active, label }: { active?: boolean; label?: string }) {
  const text = label ?? (active ? "Activo" : "Inactivo");
  return (
    <span className={`rounded-md px-2 py-1 text-xs ${active === false ? "bg-red-500/10 text-red-200" : "bg-[rgba(212,175,55,0.14)] text-[var(--gold-soft)]"}`}>
      {text}
    </span>
  );
}
