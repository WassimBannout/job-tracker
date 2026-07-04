# Job Tracker — Technical Plan (MVP)

**Companion to:** [`PRD.md`](./PRD.md)
**Status:** Draft for review
**Last updated:** 2026-07-04

Reflects resolved scope: **board-only view, password reset in MVP, hard delete
+ confirm.**

---

## 1. Current state

Scaffold already in the repo:

- **Server** — Express 5, TypeScript, ESM, `tsx watch` dev. One route:
  `GET /api/health`. No DB, no auth.
- **Client** — React 19 + Vite 8, TypeScript. Default scaffold (no router, no
  data layer, no state lib).
- **Root** — `concurrently` runs both dev servers (`npm run dev`).

So the plan is additive: we build auth, a data layer, application CRUD, and the
board UI on top of what's there.

## 2. Recommended stack additions

| Concern | Choice | Why |
|---------|--------|-----|
| Database | **SQLite** (file) via **Prisma** | Zero-infra for MVP single user; Prisma gives typed models + migrations and a clean path to Postgres later. |
| Password hashing | **bcrypt** (or `argon2`) | Standard, well-vetted. |
| Sessions | **httpOnly, Secure, SameSite=Lax cookie**, server-side session (`express-session` + store, or signed JWT) | PRD calls for cookie sessions + CSRF protection; httpOnly blocks XSS token theft. |
| CSRF | **double-submit token** or SameSite=Lax + custom header check | Required by PRD §8.1 for cookie auth. |
| Validation | **Zod** (shared schemas client+server) | One source of truth for field rules in PRD §7.1; server is authoritative. |
| Client routing | **React Router** | Login / signup / reset / board routes. |
| Server state / data fetching | **TanStack Query** | Handles loading/error/optimistic states the PRD demands (move = optimistic w/ revert). |
| Drag-and-drop | **@dnd-kit** | Has built-in **keyboard** support → satisfies PRD accessibility (drag needs non-pointer path). |
| Email (reset) | **dev: log link to console; prod: Resend/SES** | See open item O1 — reset needs an email channel. |

> These are recommendations, not commitments — flag any you'd swap (e.g.
> better-sqlite3 instead of Prisma, JWT instead of server sessions).

## 3. Data model

```
User
  id            uuid / cuid   (PK)
  email         string        (unique, lowercased)
  passwordHash  string
  createdAt     datetime
  updatedAt     datetime

Application
  id            uuid / cuid   (PK)
  ownerId       -> User.id    (FK, indexed)   # basis of isolation
  company       string        (required)
  role          string        (required)
  stage         enum          (Wishlist|Applied|Interviewing|Offer|Rejected)
  jobUrl        string?       (validated URL)
  location      string?
  dateApplied   date?
  notes         string?       (<=2000)
  createdAt     datetime
  updatedAt     datetime

PasswordResetToken
  id            uuid
  userId        -> User.id    (FK)
  tokenHash     string        (store hash, not raw token)
  expiresAt     datetime      (short TTL, e.g. 1h)
  usedAt        datetime?     (single-use)
```

- Index `Application.ownerId` (every list query filters by it).
- `stage` stored as string enum; no separate "position within column" field for
  MVP (ordering within a column = by `updatedAt` or `createdAt`; no manual
  reordering — that's Later).

## 4. API surface

All `/api/applications*` routes require an authenticated session and derive
`ownerId` from the session — **never** from the request body.

**Auth**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` | Create account, start session. |
| POST | `/api/auth/login` | Authenticate, start session. |
| POST | `/api/auth/logout` | End session. |
| GET  | `/api/auth/me` | Current user (for client bootstrap / route guards). |
| POST | `/api/auth/forgot-password` | Issue reset token (always 200, no enumeration). |
| POST | `/api/auth/reset-password` | Consume token, set new password. |

**Applications**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/applications` | List **my** applications (board reads all, groups client-side). |
| POST | `/api/applications` | Create. |
| GET | `/api/applications/:id` | Read one (mine only). |
| PATCH | `/api/applications/:id` | Edit any field, incl. `stage` (covers "move"). |
| DELETE | `/api/applications/:id` | Hard delete (mine only). |

- **Move** reuses `PATCH` with `{ stage }` — no separate endpoint.
- Non-owned `:id` → **404** (not 403) so we don't confirm the record exists.
- Errors use a consistent JSON shape `{ error: { code, message, fields? } }`.

## 5. Authorization (the critical NFR)

Enforce ownership at a single choke point so it can't be forgotten per-route:

1. `requireAuth` middleware → rejects unauthenticated (401), attaches
   `req.userId`.
2. Every application query is `where: { id, ownerId: req.userId }` — ownership
   is part of the lookup, not a post-fetch check.
3. Server ignores any client-sent `ownerId`.
4. **Negative tests are release-blocking:** user B requesting/editing/deleting
   user A's `id` must get 404 and cause no mutation.

## 6. Frontend structure

```
client/src/
  main.tsx / App.tsx        # router + providers (QueryClient, auth)
  lib/api.ts                # fetch wrapper (credentials: 'include', CSRF header)
  auth/                     # AuthContext, route guard, login/signup/reset pages
  applications/
    useApplications.ts      # TanStack Query hooks (list/create/update/delete)
    Board.tsx               # 5 columns, per-stage counts
    Column.tsx              # dnd-kit droppable, empty-column state
    ApplicationCard.tsx     # draggable card
    ApplicationForm.tsx     # add + edit (shared, Zod-validated)
    ConfirmDeleteDialog.tsx
  components/               # states: Skeleton, EmptyState, ErrorState
```

State handling maps directly to PRD §7.4:
- **Loading** → Query `isPending` → skeleton board.
- **Error** → Query `isError` → ErrorState with retry.
- **Empty (account)** → zero apps → full-page CTA.
- **Empty (column)** → placeholder in column.
- **Move** → optimistic mutation; `onError` rolls back + toast.

## 7. Build order (vertical slices, each shippable/testable)

1. **Foundation** — add Prisma + SQLite, User/Application models, Zod schemas,
   error-shape + `requireAuth` middleware. *(no UI yet)*
2. **Auth end-to-end** — signup / login / logout / me; client auth context,
   guarded routes, login + signup pages. *Milestone: I can create an account
   and land on an empty board.*
3. **Applications CRUD (API)** — list/create/read/update/delete with ownership
   + negative tests.
4. **Board read + Add** — board with 5 columns, counts, all three states, add
   form. *Milestone: add an app and see it.*
5. **Edit + Delete** — shared form for edit; confirm-delete dialog.
6. **Move** — @dnd-kit drag + keyboard alternative + mobile stage dropdown;
   optimistic update.
7. **Password reset** — forgot/reset endpoints + token table + pages (see O1).
8. **Polish/NFR pass** — responsive board, a11y (labels, focus mgmt, contrast),
   perf check at ~200 apps.

## 8. Testing & DoD

- Server: unit/integration tests per endpoint; **explicit cross-user isolation
  tests** (§5).
- Client: form validation, optimistic-move rollback, and the empty/loading/
  error renders.
- Manual pass against the PRD §10 release checklist.

## 9. Open technical items

- **O1 — Email for password reset.** Reset needs a delivery channel. Proposal:
  in dev, log the reset URL to the server console (no provider); in prod, plug
  in Resend or SES behind one interface. Confirm this is acceptable for MVP, or
  whether we defer real email and stub reset.
- **O2 — Session store.** `express-session` needs a store in prod (SQLite/Redis)
  rather than in-memory. Fine to start in-memory for dev; note before deploy.
- **O3 — Prisma vs. lighter option.** If you'd rather avoid an ORM, `better-
  sqlite3` + hand-written queries is viable and lighter. Prisma is my default
  for the typed models + migrations.
- **O4 — Deployment target** (not needed to start building, but drives session/
  cookie/HTTPS config): where will this run?
```
