import type { Application, Stage } from "../lib/applications";
import { ApplicationCard } from "./ApplicationCard";

// One pipeline stage column with its card count and an empty-column hint.
export function Column({
  stage,
  applications,
}: {
  stage: Stage;
  applications: Application[];
}) {
  return (
    <section className="column" aria-label={stage}>
      <header className="column-header">
        <span className="column-title">{stage}</span>
        <span className="column-count" aria-label={`${applications.length} applications`}>
          {applications.length}
        </span>
      </header>

      <div className="column-body">
        {applications.length === 0 ? (
          <p className="column-empty">No applications here</p>
        ) : (
          applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))
        )}
      </div>
    </section>
  );
}
