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

// Display-only card for Slice 4. Edit/delete controls arrive in Slice 5,
// drag-to-move in Slice 6.
export function ApplicationCard({ application }: { application: Application }) {
  const applied = formatDate(application.dateApplied);

  return (
    <article className="card">
      <h3 className="card-company">{application.company}</h3>
      <p className="card-role">{application.role}</p>
      <div className="card-meta">
        {application.location && <span>{application.location}</span>}
        {applied && <span>Applied {applied}</span>}
      </div>
    </article>
  );
}
