import type { InputHTMLAttributes } from "react";

export function MoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="number" min="0" step="0.01" className={`rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white ${props.className ?? ""}`} />;
}
