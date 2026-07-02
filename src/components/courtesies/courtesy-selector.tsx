"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export type CourtesySelection =
  | { kind: "single"; role: string; productId: string; label?: string }
  | { kind: "combo"; comboType: "coffee_keke" | "cappuccino_keke"; items: { role: string; productId: string }[]; label?: string };

type CourtesyOption = Record<string, any>;

export function CourtesySelector({
  branchId,
  amount,
  value,
  onChange,
  endpoint = "/api/control/courtesies/options",
  headers
}: {
  branchId: string;
  amount: number;
  value: CourtesySelection | null;
  onChange: (value: CourtesySelection | null) => void;
  endpoint?: string;
  headers?: HeadersInit;
}) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CourtesyOption[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!branchId || amount <= 0) {
      setOptions([]);
      setMessage("");
      return;
    }
    let alive = true;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ branch_id: branchId, service_price: String(amount), order_total: String(amount) });
      const response = await fetch(`${endpoint}?${params}`, { cache: "no-store", headers });
      const data = await response.json();
      if (!alive) return;
      setLoading(false);
      if (!response.ok) {
        setOptions([]);
        setMessage(data.error ?? "No se pudieron cargar cortesias.");
        return;
      }
      setOptions(data.options ?? []);
      setMessage(data.message ?? "");
    }
    void load();
    return () => {
      alive = false;
    };
  }, [amount, branchId, endpoint, headers]);

  const encodedValue = value ? encodeSelection(value) : "";

  return (
    <div className="grid gap-1">
      <select
        className="control-input"
        value={encodedValue}
        onChange={(event) => {
          const selected = options.find((option) => encodeOption(option) === event.target.value);
          onChange(selected ? optionToSelection(selected) : null);
        }}
      >
        <option value="">Sin cortesia</option>
        {options.map((option) => (
          <option key={encodeOption(option)} value={encodeOption(option)} disabled={!option.available}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
      {loading ? <span className="inline-flex items-center gap-1 text-xs text-[var(--control-muted)]"><Loader2 className="animate-spin" size={12} /> Cargando cortesias...</span> : null}
      {!loading && message ? <span className="text-xs text-[var(--control-muted)]">{message}</span> : null}
    </div>
  );
}

function optionLabel(option: CourtesyOption) {
  if (option.kind === "combo") return `${option.label}${option.available ? "" : ` - ${option.disabledReason ?? "No disponible"}`}`;
  return `${option.productName} · Stock ${option.stockCurrent}${option.available ? "" : ` - ${option.disabledReason ?? "No disponible"}`}`;
}

function optionToSelection(option: CourtesyOption): CourtesySelection {
  if (option.kind === "combo") {
    return {
      kind: "combo",
      comboType: option.comboType,
      items: (option.items ?? []).map((item: any) => ({ role: item.role, productId: item.productId })),
      label: option.label
    };
  }
  return { kind: "single", role: option.role, productId: option.productId, label: option.productName };
}

function encodeOption(option: CourtesyOption) {
  return encodeSelection(optionToSelection(option));
}

function encodeSelection(selection: CourtesySelection) {
  if (selection.kind === "combo") return `combo:${selection.comboType}:${selection.items.map((item) => `${item.role}:${item.productId}`).join("|")}`;
  return `single:${selection.role}:${selection.productId}`;
}
