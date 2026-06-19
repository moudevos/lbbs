import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

export function ControlCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`control-card min-w-0 max-w-full rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] text-[var(--control-text)] shadow-[var(--control-shadow)] ${className}`} {...props} />;
}

export function ControlInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`control-input ${className}`} {...props} />;
}

export function ControlButton({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = variant === "primary"
    ? "control-primary-action"
    : variant === "danger"
      ? "border border-[var(--control-danger)] bg-[var(--control-danger-soft)] text-[var(--control-danger)]"
      : "border border-[var(--control-border-strong)] bg-[var(--control-surface-2)] text-[var(--control-text)] hover:bg-[var(--control-surface-3)]";
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`} {...props} />;
}
