"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SearchComboboxItem = {
  id: string;
  label: string;
  subtitle?: string;
  metadata?: Record<string, any>;
};

export function SearchCombobox({
  label,
  placeholder,
  endpoint,
  value,
  onSelect,
  extraParams,
  disabled
}: {
  label: string;
  placeholder: string;
  endpoint: string;
  value: SearchComboboxItem | null;
  onSelect: (item: SearchComboboxItem | null) => void;
  extraParams?: Record<string, string>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 3 || value) {
      setItems([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: query.trim(), ...(extraParams ?? {}) });
        const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
        setItems(data.items ?? []);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [endpoint, extraParams, query, value]);

  return (
    <label className="relative block text-sm text-[var(--control-muted)]">
      <span className="mb-2 block">{label}</span>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface-2)] px-3 py-2 text-[var(--control-text)]">
          <div className="min-w-0">
            <p className="truncate font-semibold">{value.label}</p>
            {value.subtitle ? <p className="truncate text-xs text-[var(--control-muted)]">{value.subtitle}</p> : null}
          </div>
          <button type="button" className="rounded-lg border border-[var(--control-border)] p-1" onClick={() => { onSelect(null); setQuery(""); }}><X size={15} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--control-muted)]" size={16} />
          <input
            className="control-input w-full"
            style={{ paddingLeft: "3rem", paddingRight: "2.75rem" }}
            disabled={disabled}
            placeholder={placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" && items[0]) {
                event.preventDefault();
                onSelect(items[0]);
                setOpen(false);
              }
            }}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--control-muted)]" size={16} /> : null}
        </div>
      )}
      {!value && open && query.trim().length >= 3 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-1 shadow-[var(--control-shadow)]">
          {items.map((item) => (
            <button key={item.id} type="button" className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--control-surface-3)]" onClick={() => { onSelect(item); setOpen(false); }}>
              <span className="block font-semibold text-[var(--control-text)]">{item.label}</span>
              {item.subtitle ? <span className="block text-xs text-[var(--control-muted)]">{item.subtitle}</span> : null}
            </button>
          ))}
          {items.length === 0 && !loading ? <p className="px-3 py-2 text-xs text-[var(--control-muted)]">Sin resultados.</p> : null}
          {error ? <p className="px-3 py-2 text-xs text-red-200">{error}</p> : null}
        </div>
      ) : null}
      {!value && query.trim().length > 0 && query.trim().length < 3 ? <span className="text-xs text-[var(--control-muted)]">Escribe al menos 3 caracteres.</span> : null}
    </label>
  );
}
