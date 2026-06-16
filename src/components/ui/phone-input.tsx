import type { InputHTMLAttributes } from "react";

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} inputMode="tel" className={`rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white ${props.className ?? ""}`} />;
}
