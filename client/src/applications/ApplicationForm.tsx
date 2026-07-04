import { useState, type FormEvent } from "react";
import { ApiRequestError } from "../lib/api";
import {
  STAGES,
  type ApplicationInput,
  type Stage,
} from "../lib/applications";

type Props = {
  initial?: Partial<ApplicationInput>;
  submitLabel: string;
  onSubmit: (input: ApplicationInput) => Promise<void>;
  onCancel: () => void;
};

// Add/edit form. Trims inputs and omits empty optional fields before submitting;
// surfaces API field errors inline and other failures as a banner.
export function ApplicationForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [stage, setStage] = useState<Stage>(initial?.stage ?? "Wishlist");
  const [jobUrl, setJobUrl] = useState(initial?.jobUrl ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  // A <input type="date"> needs a yyyy-mm-dd value.
  const [dateApplied, setDateApplied] = useState(
    initial?.dateApplied ? initial.dateApplied.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFields({});
    setFormError(null);

    // Emptied optionals become null so an edit can clear a previously-set value.
    const orNull = (v: string) => {
      const t = v.trim();
      return t === "" ? null : t;
    };

    const input: ApplicationInput = {
      company: company.trim(),
      role: role.trim(),
      stage,
      jobUrl: orNull(jobUrl),
      location: orNull(location),
      dateApplied: orNull(dateApplied),
      notes: orNull(notes),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.fields) setFields(err.fields);
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
    <form className="app-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="form-error" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="company">Company *</label>
        <input
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          aria-invalid={Boolean(fields.company)}
          required
        />
        {fields.company && (
          <span className="field-error" role="alert">
            {fields.company}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="role">Role *</label>
        <input
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-invalid={Boolean(fields.role)}
          required
        />
        {fields.role && (
          <span className="field-error" role="alert">
            {fields.role}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="stage">Stage</label>
        <select
          id="stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="jobUrl">Job posting URL</label>
        <input
          id="jobUrl"
          type="url"
          placeholder="https://…"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          aria-invalid={Boolean(fields.jobUrl)}
        />
        {fields.jobUrl && (
          <span className="field-error" role="alert">
            {fields.jobUrl}
          </span>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="dateApplied">Date applied</label>
          <input
            id="dateApplied"
            type="date"
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
