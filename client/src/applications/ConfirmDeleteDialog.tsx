import { useState } from "react";
import { Modal } from "../components/Modal";
import type { Application } from "../lib/applications";

// Confirmation for the hard delete (PRD §6 B5): names the application and warns
// the action is permanent. Surfaces a failure inline and keeps the card.
export function ConfirmDeleteDialog({
  application,
  onConfirm,
  onClose,
}: {
  application: Application;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm(application.id);
      onClose();
    } catch {
      setError("Couldn’t delete this application. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Delete application" onClose={onClose}>
      <p className="confirm-text">
        Delete the application for <strong>{application.company}</strong> (
        {application.role})? This can’t be undone.
      </p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={handleConfirm}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
