import { useState, type FormEvent, type ReactNode } from "react";
import { ApiRequestError } from "../lib/api";

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  onSubmit: (email: string, password: string) => Promise<void>;
  footer: ReactNode;
};

// Shared presentational form for login + signup. Renders inline field errors
// (from the API's { fields } map) and a form-level error banner.
export function AuthForm({
  title,
  subtitle,
  submitLabel,
  passwordAutoComplete,
  onSubmit,
  footer,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFields({});
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
      // Navigation on success is handled by the parent.
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.fields) setFields(err.fields);
        // Show the message as a banner unless it was purely field-level.
        if (!err.fields || Object.keys(err.fields).length === 0) {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit} noValidate>
      <h1>{title}</h1>
      <p className="subtitle">{subtitle}</p>

      {formError && (
        <div className="form-error" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fields.email)}
          required
        />
        {fields.email && (
          <span className="field-error" role="alert">
            {fields.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={passwordAutoComplete}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fields.password)}
          required
        />
        {fields.password && (
          <span className="field-error" role="alert">
            {fields.password}
          </span>
        )}
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Please wait…" : submitLabel}
      </button>

      <div className="auth-switch">{footer}</div>
    </form>
  );
}
