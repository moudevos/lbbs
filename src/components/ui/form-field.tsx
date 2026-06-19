import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
};

export function FormField(props: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <input className={`control-input mt-2 ${className ?? ""}`} {...inputProps} />
    </label>
  );
}

export function TextAreaField(props: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { label, className, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <textarea className={`control-input mt-2 min-h-20 ${className ?? ""}`} {...inputProps} />
    </label>
  );
}

export function SelectField(props: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { label, className, children, ...inputProps } = props;
  return (
    <label className="block text-sm text-[var(--text-muted)]">
      {label}
      <select className={`control-input mt-2 ${className ?? ""}`} {...inputProps}>
        {children}
      </select>
    </label>
  );
}
