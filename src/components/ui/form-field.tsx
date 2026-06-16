import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
};

export function FormField(props: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <input className={`mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white ${className ?? ""}`} {...inputProps} />
    </label>
  );
}

export function TextAreaField(props: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { label, className, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <textarea className={`mt-2 min-h-20 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white ${className ?? ""}`} {...inputProps} />
    </label>
  );
}

export function SelectField(props: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { label, className, children, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <select className={`mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white ${className ?? ""}`} {...inputProps}>
        {children}
      </select>
    </label>
  );
}
