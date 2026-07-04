import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Board } from "../applications/Board";
import { ApplicationForm } from "../applications/ApplicationForm";
import { Modal } from "../components/Modal";
import { useCreateApplication } from "../lib/applications";

export function BoardPage() {
  const { user, logout } = useAuth();
  const [adding, setAdding] = useState(false);
  const createApplication = useCreateApplication();

  return (
    <>
      <header className="app-header">
        <span className="brand">Job Tracker</span>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary btn-inline"
            onClick={() => setAdding(true)}
          >
            Add application
          </button>
          <span className="header-email">{user?.email}</span>
          <button type="button" className="btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>

      <main className="board-wrap">
        <Board onAddFirst={() => setAdding(true)} />
      </main>

      {adding && (
        <Modal title="Add application" onClose={() => setAdding(false)}>
          <ApplicationForm
            submitLabel="Add application"
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              await createApplication.mutateAsync(input);
              setAdding(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
