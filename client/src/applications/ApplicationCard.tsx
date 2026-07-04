import type { Application } from "../lib/applications";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Application card with edit/delete controls. Drag-to-move arrives in Slice 6.
export function ApplicationCard({
  application,
  onEdit,
  onDelete,
}: {
  application: Application;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
}) {
  const applied = formatDate(application.dateApplied);

  return (
    <article className="card">
      <div className="card-actions">
        <button
          type="button"
          className="card-action"
          aria-label={`Edit application for ${application.company}`}
          onClick={() => onEdit(application)}
        >
          Edit
        </button>
        <button
          type="button"
          className="card-action card-action-danger"
          aria-label={`Delete application for ${application.company}`}
          onClick={() => onDelete(application)}
        >
          Delete
        </button>
      </div>
      <h3 className="card-company">{application.company}</h3>
      <p className="card-role">{application.role}</p>
      <div className="card-meta">
        {application.location && <span>{application.location}</span>}
        {applied && <span>Applied {applied}</span>}
      </div>
    </article>
  );
}
