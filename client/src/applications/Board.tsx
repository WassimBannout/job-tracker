import { useState } from "react";
import {
  STAGES,
  useApplications,
  useDeleteApplication,
  useUpdateApplication,
  type Application,
} from "../lib/applications";
import { Column } from "./Column";
import { Modal } from "../components/Modal";
import { ApplicationForm } from "./ApplicationForm";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

function groupByStage(apps: Application[]) {
  const groups = Object.fromEntries(
    STAGES.map((s) => [s, [] as Application[]]),
  ) as Record<(typeof STAGES)[number], Application[]>;
  for (const app of apps) groups[app.stage]?.push(app);
  return groups;
}

// Renders the board data states (loading / error / empty / populated).
// The account-level empty state is handled by the parent so it can show the
// primary "Add your first application" CTA next to the add button.
export function Board({ onAddFirst }: { onAddFirst: () => void }) {
  const { data, isPending, isError, refetch, isFetching } = useApplications();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();
  const [editing, setEditing] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);

  if (isPending) {
    return (
      <div className="board" aria-busy="true">
        {STAGES.map((stage) => (
          <section className="column" key={stage} aria-label={`${stage} (loading)`}>
            <header className="column-header">
              <span className="column-title">{stage}</span>
            </header>
            <div className="column-body">
              <div className="card skeleton" />
              <div className="card skeleton" />
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="board-message" role="alert">
        <p>We couldn’t load your applications.</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Retrying…" : "Try again"}
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="board-message">
        <h2>No applications yet</h2>
        <p>Track your first job to get started.</p>
        <button type="button" className="btn-primary btn-inline" onClick={onAddFirst}>
          Add your first application
        </button>
      </div>
    );
  }

  const groups = groupByStage(data);

  return (
    <>
      <div className="board">
        {STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            applications={groups[stage]}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        ))}
      </div>

      {editing && (
        <Modal title="Edit application" onClose={() => setEditing(null)}>
          <ApplicationForm
            initial={editing}
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              await updateApplication.mutateAsync({ id: editing.id, input });
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDeleteDialog
          application={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(id) => deleteApplication.mutateAsync(id)}
        />
      )}
    </>
  );
}
