"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string; searchText?: string };

export function ControlCombobox({ value, options, placeholder, disabled, onChange }: { value: string; options: ComboboxOption[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options.filter((item) => `${item.label} ${item.searchText ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", key); };
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button type="button" disabled={disabled} className="control-input flex min-w-0 items-center justify-between gap-2 text-left disabled:opacity-60" onClick={() => setOpen((current) => !current)}>
        <span className="truncate">{selected?.label ?? placeholder}</span><ChevronDown size={16} />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[100] w-full min-w-[220px] max-w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] shadow-[var(--control-shadow)]">
          <div className="flex items-center gap-2 border-b border-[var(--control-border)] p-2"><Search size={15} /><input autoFocus className="min-w-0 flex-1 bg-transparent px-1 py-1 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." />{query ? <button onClick={() => setQuery("")}><X size={14} /></button> : null}</div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {filtered.map((item) => <button key={item.value} type="button" className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--control-surface-3)] ${item.value === value ? "bg-[var(--control-primary-soft)] text-[var(--control-primary)]" : ""}`} onClick={() => { onChange(item.value); setOpen(false); setQuery(""); }}>{item.label}</button>)}
            {!filtered.length ? <p className="px-3 py-4 text-center text-sm text-[var(--control-muted)]">Sin resultados</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
