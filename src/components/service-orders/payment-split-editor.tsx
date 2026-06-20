"use client";

import { Plus, Trash2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";

const methods: Exclude<PaymentMethod, "mixto">[] = ["efectivo", "yape", "plin", "tarjeta", "transferencia"];

export function PaymentSplitEditor({
  total,
  method,
  splits,
  onMethodChange,
  onSplitsChange
}: {
  total: number;
  method: PaymentMethod;
  splits: PaymentSplit[];
  onMethodChange: (method: PaymentMethod) => void;
  onSplitsChange: (splits: PaymentSplit[]) => void;
}) {
  const paid = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0);
  const pending = Math.round((total - paid) * 100) / 100;

  function update(index: number, patch: Partial<PaymentSplit>) {
    onSplitsChange(splits.map((split, i) => i === index ? { ...split, ...patch } : split));
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
      <label className="text-sm text-[var(--text-muted)]">
        Metodo de pago
        <select className="control-input mt-2" value={method} onChange={(event) => onMethodChange(event.target.value as PaymentMethod)}>
          {methods.map((item) => <option key={item} value={item}>{item}</option>)}
          <option value="mixto">mixto</option>
        </select>
      </label>

      {method === "mixto" ? (
        <div className="grid min-w-0 max-w-full gap-2">
          {splits.map((split, index) => (
            <div key={index} className="grid min-w-0 max-w-full grid-cols-1 gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--control-surface-2)] p-2 sm:grid-cols-2">
              <select className="control-input min-w-0" value={split.method} onChange={(event) => update(index, { method: event.target.value as PaymentSplit["method"] })}>
                {methods.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <MoneyInput value={split.amount} onChange={(event) => update(index, { amount: Number(event.target.value) })} />
              <input className="control-input min-w-0 truncate sm:col-span-2" placeholder="Referencia" value={split.reference ?? ""} onChange={(event) => update(index, { reference: event.target.value })} />
              <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-red-200" onClick={() => onSplitsChange(splits.filter((_, i) => i !== index))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => onSplitsChange([...splits, { method: "efectivo", amount: Math.max(pending, 0), reference: "" }])}>
            <Plus size={16} /> Agregar metodo
          </button>
          <p className={pending === 0 ? "text-sm text-green-300" : "text-sm text-red-200"}>Pagado: S/ {paid.toFixed(2)} - Saldo: S/ {pending.toFixed(2)}</p>
        </div>
      ) : null}
    </div>
  );
}
