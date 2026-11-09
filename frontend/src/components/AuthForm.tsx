import { useState } from "react";
import { useForm } from "../hooks/useForm";
import { parseError } from "../lib/api";
import { TextField } from "./TextField";

export type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
};

type Props = {
  title: string;
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function AuthForm({ title, fields, submitLabel, onSubmit }: Props) {
  const { values, onChange } = useForm<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit(values);
    } catch (err) {
      const { message, fields } = parseError(err);
      setError(message);
      setFieldErrors(fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{title}</h1>
      {fields.map((f) => (
        <TextField
          key={f.name}
          name={f.name}
          label={f.label}
          type={f.type ?? "text"}
          autoComplete={f.autoComplete}
          value={values[f.name]}
          onChange={onChange}
          error={fieldErrors[f.name]}
          required
        />
      ))}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
