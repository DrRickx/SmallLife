import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...input }: Props) {
  const id = input.id ?? input.name;
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
