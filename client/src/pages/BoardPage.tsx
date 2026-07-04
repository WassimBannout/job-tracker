import { useAuth } from "../auth/AuthContext";

// Placeholder board for Slice 2 — proves an authenticated user lands here after
// signup/login and can log out. The real board (columns, cards, CRUD) arrives
// in Slices 3–6.
export function BoardPage() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="app-header">
        <span className="brand">Job Tracker</span>
        <div>
          <span style={{ marginRight: 12, fontSize: 14 }}>{user?.email}</span>
          <button type="button" className="btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>

      <main className="board-empty">
        <h2>No applications yet</h2>
        <p>Your board is empty. Adding applications comes next.</p>
      </main>
    </>
  );
}
