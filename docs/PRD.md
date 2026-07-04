# Job Tracker — Product Requirements Document (MVP)

**Status:** Draft for review
**Owner:** Product
**Last updated:** 2026-07-04

---

## Implementation Status (as of 2026-07-04)

> Living section — reflects what's actually built, not just planned. Build order
> and technical detail live in [`TECH_PLAN.md`](./TECH_PLAN.md) §7.

**Overall: ~4 of 8 build slices complete.** Accounts work end-to-end, the CRUD
API is in place, and the board now renders applications by stage and supports
adding one. Editing, deleting, and drag-to-move are next.

**Legend:** ✅ Done · 🟡 In progress · ⬜ Not started

| Slice | Scope | Status |
|-------|-------|--------|
| 1. Foundation | DB + models, validation, error shape, auth middleware | ✅ Done |
| 2. Auth end-to-end | signup / login / logout / me, password hashing | ✅ Done |
| 3. Applications CRUD (API) | list / create / read / update / delete + ownership | ✅ Done |
| 4. Board read + Add | board, per-stage counts, empty/loading/error, add form | ✅ Done |
| 5. Edit + Delete | shared edit form, confirm-delete dialog | ⬜ Not started |
| 6. Move | drag-and-drop + keyboard/mobile fallback, optimistic update | ⬜ Not started |
| 7. Password reset | forgot/reset endpoints + token flow + pages | ⬜ Not started |
| 8. Polish / NFR pass | responsive, accessibility, performance check | ⬜ Not started |

**What exists today (Slices 1–2):**

- **Database** — Prisma 7 + SQLite with the `User`, `Application`, and
  `PasswordResetToken` models from §7.1. `Application.ownerId` is indexed and
  cascade-deletes with its user. Initial migration applied.
- **Validation** — Zod schemas encoding the §7.1 field rules and the five-stage
  enum, for both auth and application create/update.
- **Error handling** — a consistent API error shape
  (`{ error: { code, message, fields? } }`) with automatic validation-error
  flattening.
- **Auth (server)** — `signup` / `login` / `logout` / `me` endpoints with
  bcrypt password hashing (cost 12), cookie sessions (httpOnly, SameSite=Lax),
  and non-enumerating errors on duplicate signup and failed login (constant-time
  compare on unknown emails).
- **Auth (client)** — React Router app with an `AuthProvider` (bootstraps via
  `/me`), a `RequireAuth` guard that redirects to `/login`, login + signup pages
  with inline field/validation errors, and a placeholder board with log-out.
- **Applications API** — `GET/POST /api/applications` and
  `GET/PATCH/DELETE /api/applications/:id`, all behind `requireAuth`. `ownerId`
  is taken from the session; ownership is part of every query; a non-owned `:id`
  returns 404 (never reveals another user's record). `PATCH` also serves the
  stage "move". Hard delete per resolved scope.
- **Tests** — integration suite (node:test + supertest, dedicated test DB)
  covering CRUD happy paths, validation, auth, and the **release-blocking
  cross-user isolation** case (user B gets 404 on user A's record for
  read/edit/delete, and never sees it in their list). 6/6 passing.
- **Board UI (read + add)** — TanStack Query data layer; a five-column board
  grouping applications by stage with per-column counts; loading skeletons,
  an error state with retry, an account-level empty state with a primary CTA,
  and empty-column hints; an accessible add-application modal (labelled dialog,
  Esc/backdrop close, focus management) with all §7.1 fields, inline field/API
  validation errors, and a refetch on success. Cards are display-only for now.
- **Verified end-to-end** (through the Vite proxy, cookies included): sign up →
  session → board; duplicate email → 409; weak password → 400 field error; wrong
  password / unknown email → identical 401; logout clears the session; empty
  board → add → the new card appears in the correct stage column with updated
  counts.

**Not yet built:** editing and deleting applications, drag-to-move between
stages (plus its keyboard/mobile fallback), and password reset.

**Requirement coverage so far:**

- §6 Epic A (sign up / log in / log out) — ✅ implemented and verified
  (password-reset story A4 still pending, Slice 7).
- §6 Epic B — 🟡 B1 (add) and B2 (view board) done; B3 (move), B4 (edit),
  B5 (delete) pending (Slices 5–6).
- §7.1 data model — ✅ implemented and exposed via the CRUD API and the add form.
- §7.2 pipeline stages — ✅ defined, validated, and rendered as board columns;
  stage move via `PATCH` (UI move pending Slice 6).
- §7.4 UI states — ✅ loading / empty (account + column) / error / success all
  handled on the board and add flow.
- §8.1 authorization — ✅ per-record ownership enforced and covered by the
  cross-user isolation tests. (Other NFRs — performance, a11y, responsive — are
  partially addressed and finalized in the Slice 8 polish pass.)
- All other functional/NFR requirements — ⬜ pending their slice above.

**Open item blocking a later slice:** password reset (Slice 7) still needs an
email-delivery decision — see [`TECH_PLAN.md`](./TECH_PLAN.md) O1.

---

## 1. Overview & Goal

**Job Tracker** is a single-user web app that helps a job seeker keep every
application they've made in one organized place and see, at a glance, where each
one stands in the hiring process.

**The problem.** A serious job search quickly sprawls across spreadsheets,
email threads, browser tabs, and memory. Applicants lose track of which
companies they've applied to, which are waiting on them, and which have gone
cold. This causes missed follow-ups, duplicate applications, and a general
loss of control over a stressful process.

**The solution.** A simple, Trello/CRM-style pipeline board where each job
application is a card that moves left-to-right through stages
(**Wishlist → Applied → Interviewing → Offer → Rejected**). The user can add,
edit, move, and delete applications, and always see the full picture of their
search in one screen.

**Goal of the MVP.** Prove that a focused, single-user pipeline tool is enough
to replace the "job search spreadsheet." Ship the smallest thing that lets one
person reliably capture applications and track them through stages — nothing
more.

**Non-goals of the MVP.** We are not building a job board, an application
autofill tool, a networking CRM, or a team/recruiter product. We are not
optimizing analytics, reminders, or integrations yet (see [§5 Out of Scope](#5-out-of-scope-later)).

---

## 2. Target User / Persona

**Primary persona — "Active Alex," the self-directed job seeker**

- Mid-career or early-career professional running their own job search, often
  while employed or studying.
- Has 10–40 applications in flight over a few months. Enough volume that a
  spreadsheet gets unwieldy, not so much that they need automation.
- Reasonably comfortable with web apps (uses Notion, Trello, Google Sheets),
  but wants *less* setup, not a blank canvas to configure.
- Uses a laptop primarily, but frequently checks status on a phone (e.g. right
  after a recruiter call).

**What Alex wants to accomplish**

- "Capture a new application in under 30 seconds so I actually log it instead
  of telling myself I'll do it later."
- "See everything I've got going on, grouped by where it stands."
- "Move a job forward the moment something changes (got a call → Interviewing)."
- "Trust that the record is accurate — fix a typo, kill a dead lead, without
  friction."

**Explicitly out of persona for MVP:** recruiters, career coaches, teams, or
anyone tracking *other people's* applications.

---

## 3. Assumptions & Open Questions

These are inferences made to keep the MVP tight. **Please confirm or correct —
each one shapes scope.**

### Assumptions

1. **Single user, single account.** Each person tracks only their own search.
   No sharing, collaboration, or multi-tenant orgs. (Multi-user *isolation* is
   still required for security — see [§8](#8-non-functional-requirements).)
2. **Email + password auth is acceptable for MVP.** No SSO / social login
   required to launch. Session-based or token-based auth is an implementation
   detail left to engineering.
3. **The pipeline stages are fixed** (Wishlist, Applied, Interviewing, Offer,
   Rejected). Users cannot rename, reorder, or add custom stages in MVP.
4. **One application = one card = one row.** No sub-stages, no per-interview
   round tracking (e.g. "Phone Screen" vs "Onsite") in MVP; "Interviewing" is a
   single bucket.
5. **Data is manually entered.** No importing from job boards, email parsing,
   or browser autofill.
6. **A card lives in exactly one stage at a time**, and moving it is an explicit
   user action (drag or a "move" control).
7. **No hard limits on volume** for a normal user; we design for up to ~500
   applications per account without performance degradation.
8. **Web-only, responsive.** No native mobile app; the web app must work well
   on a phone browser.
9. **Rejected is a terminal-ish stage** but the card is *not* deleted — the user
   keeps a history. Deletion is a separate, deliberate action.

### Open questions (need your decision)

- **Q1. — RESOLVED:** Default view is the **kanban board only** for MVP. No
  list/table view (moved to Later).
- **Q2.** Is **email verification** required at sign-up, or is unverified
  sign-in acceptable for MVP? *Assumption: not required for MVP.*
- **Q3. — RESOLVED:** **Password reset ("forgot password") is IN the MVP**
  (minimal, single-use, time-limited token flow).
- **Q4.** Do we need a **"Notes"** free-text field on an application in MVP, or
  is that Later? *Assumption: include a single notes field — it's cheap and
  high-value.*
- **Q5. — RESOLVED:** Delete is a **hard delete with a confirmation step** for
  MVP (no soft-delete/trash).
- **Q6.** Should stages have a **visible count / card total** per column?
  *Assumption: yes, trivial and useful.*
- **Q7.** Any requirement to **track dates** beyond "date applied" (e.g. next
  interview date)? *Assumption: no — only capture `dateApplied` and let
  created/updated timestamps be automatic. Interview dates are Later.*

---

## 4. In Scope (MVP)

A **ruthless** list. If it's not here, it's [Later](#5-out-of-scope-later).

| # | Capability | Summary |
|---|-----------|---------|
| S1 | **Sign up** | Create an account with email + password. |
| S2 | **Log in / Log out** | Authenticate and end a session. |
| S3 | **Add an application** | Create a new application card with core fields. |
| S4 | **View applications** | See all of *my* applications on a board (columns = stages), with per-stage counts. |
| S5 | **Move between stages** | Change an application's stage (drag-and-drop and/or an explicit control). |
| S6 | **Edit an application** | Update any field on an existing application. |
| S7 | **Delete an application** | Permanently remove an application, with confirmation. |
| S8 | **Data isolation** | A user can only ever see and act on their own applications. |
| S9 | **Core states** | Every view handles empty, loading, and error states. |

Supporting essentials assumed within scope: basic input validation, a
confirmation on destructive actions, and responsive layout for phone + desktop.

---

## 5. Out of Scope (Later)

Tempting but deliberately deferred. Not in MVP.

- **Reminders & follow-up nudges** (e.g. "you haven't heard back in 7 days").
- **Analytics & reporting** (funnel conversion, response rates, time-in-stage,
  charts).
- **File uploads / attachments** (resume, cover letter, JD PDFs).
- **Search & filtering** across applications.
- **Tags / labels / custom fields.**
- **Browser extension / one-click apply capture.**
- **Custom or reorderable pipeline stages.**
- **Per-interview-round tracking** (phone screen, technical, onsite, etc.).
- **Contacts / recruiter CRM** (tracking people, not just jobs).
- **Email or calendar integration** (parse confirmations, schedule interviews).
- **Notifications** (email/push) of any kind.
- **Import/export** (CSV, spreadsheet import, job-board sync).
- **Bulk actions** (multi-select move/delete).
- **Sorting options, list/table view customization, saved views.**
- **Sharing / collaboration / teams / recruiter roles.**
- **Activity history / audit log / undo.**
- **Dark mode, theming, localization/i18n.**
- **Social / SSO login** (Google, LinkedIn, GitHub).
- **Native mobile apps.**

> **Resolved:** *Password reset* is **in** MVP; *delete* is **hard delete +
> confirm** (no soft-delete/undo). Soft-delete/undo remains Later.

---

## 6. User Stories & Acceptance Criteria

### Epic A — Accounts & Auth

**A1 — Sign up**
> As a job seeker, I want to create an account with my email and password, so
> that my applications are saved and private to me.

*Acceptance criteria*
- Given a valid, unused email and a password meeting the policy, when I submit
  the sign-up form, then an account is created and I'm logged in (landed on my
  board).
- Password policy is enforced and communicated (assumption: min 8 characters;
  confirm).
- Submitting an already-registered email shows a clear, non-enumerating error
  ("That email can't be used" or "Please log in") without revealing whether the
  account exists, per security preference.
- Invalid email format is rejected inline before submit.
- Errors do not clear the email field the user already typed.

**A2 — Log in**
> As a returning user, I want to log in, so that I can get back to my board.

*Acceptance criteria*
- Correct credentials → authenticated session → my board.
- Incorrect credentials → generic "Email or password is incorrect" (no
  enumeration).
- The board and all API calls require an authenticated session; unauthenticated
  access redirects to login.

**A3 — Log out**
> As a user, I want to log out, so that no one on a shared device can see my data.

*Acceptance criteria*
- A visible log-out control ends the session.
- After logout, protected routes are inaccessible and redirect to login.

**A4 — (Conditional) Password reset** *(pending Q3)*
> As a locked-out user, I want to reset my password, so that I can regain access.

*Acceptance criteria (if in scope)*
- Requesting reset for any email shows the same confirmation message regardless
  of whether the account exists (no enumeration).
- A reset link/token is time-limited and single-use.

### Epic B — Managing Applications

**B1 — Add an application**
> As a job seeker, I want to add an application, so that I can track a job I'm
> pursuing.

*Acceptance criteria*
- An "Add application" control is available from the board.
- Required fields (see [§7.1](#71-application-data-model)) must be filled;
  submit is blocked with inline errors otherwise.
- On save, the new card appears immediately in the correct stage column (default
  **Wishlist**, or the stage chosen at creation).
- Optional fields can be left blank.
- Cancelling discards the entry and returns to the board unchanged.

**B2 — View applications (board)**
> As a job seeker, I want to see all my applications grouped by stage, so that I
> understand my whole pipeline at a glance.

*Acceptance criteria*
- The board shows five columns in fixed order: Wishlist, Applied, Interviewing,
  Offer, Rejected.
- Each column shows its cards and a count.
- Each card shows at minimum: company, role/title, and stage-relevant info
  (e.g. date applied).
- Only the logged-in user's applications appear.
- **Empty state** (no applications at all): friendly prompt with a primary
  "Add your first application" call to action.
- **Empty column:** the column renders with a subtle "No applications here" hint,
  not a broken/blank box.
- **Loading state:** a skeleton/loading indicator while data loads.
- **Error state:** if load fails, an error message with a retry action; no
  silent blank screen.

**B3 — Move an application between stages**
> As a job seeker, I want to move an application to a new stage, so that its
> status stays accurate as things progress.

*Acceptance criteria*
- The user can move a card via drag-and-drop between columns **and/or** via an
  explicit "Change stage" control on the card/detail (at least one must work on
  touch/mobile).
- The move persists; on reload the card is in the new stage.
- The card visibly updates in the UI immediately (optimistic update acceptable).
- If the move fails to persist, the card returns to its prior stage and an error
  is shown (no silent data loss).
- Moving does not lose or alter any other field on the application.

**B4 — Edit an application**
> As a job seeker, I want to edit an application's details, so that I can fix
> mistakes or add information I learned later.

*Acceptance criteria*
- Any field, including stage, can be edited from an edit form/detail view.
- Validation matches the add form.
- On save, changes persist and the board reflects them immediately.
- Cancelling discards changes; the record is unchanged.
- Editing another user's application is impossible (not just hidden — rejected
  server-side).

**B5 — Delete an application**
> As a job seeker, I want to delete an application, so that dead or mistaken
> entries don't clutter my board.

*Acceptance criteria*
- Deletion requires an explicit confirmation ("Delete application for {company}?
  This can't be undone.").
- On confirm, the card is removed from the board immediately and no longer
  returned by the API.
- On cancel, nothing changes.
- Deletion only ever affects the requesting user's own application (enforced
  server-side).
- (If soft-delete chosen per Q5, adjust: card is hidden and recoverable.)

---

## 7. Functional Requirements

### 7.1 Application data model

Fields on a single application (an application card):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | system | — | Unique, server-generated. |
| `ownerId` | system | — | The owning user; never client-settable. Basis of isolation. |
| `company` | text | **Yes** | Company name. Trimmed; max ~120 chars. |
| `role` / `title` | text | **Yes** | Job title / role applied for. Max ~120 chars. |
| `stage` | enum | **Yes** | One of the five pipeline stages. Defaults to **Wishlist**. |
| `jobUrl` | URL | No | Link to the posting. Validated as URL if present. |
| `location` | text | No | e.g. "Remote", "Berlin". Max ~120 chars. |
| `dateApplied` | date | No | Date the user applied. Optional (a Wishlist item may have none). |
| `notes` | long text | No (pending Q4) | Free-text notes. Max ~2000 chars. |
| `createdAt` | system | — | Auto timestamp. |
| `updatedAt` | system | — | Auto timestamp; updated on any change incl. stage move. |

Validation rules:
- Required fields cannot be empty/whitespace.
- Length limits enforced client- and server-side; server is source of truth.
- `stage` must be one of the allowed enum values; anything else is rejected.
- `jobUrl`, if provided, must be a well-formed http(s) URL.

### 7.2 Pipeline stages

Fixed, ordered, non-customizable in MVP:

1. **Wishlist** — interested, not yet applied.
2. **Applied** — application submitted.
3. **Interviewing** — in the interview process (any round).
4. **Offer** — received an offer.
5. **Rejected** — rejected or withdrawn (single terminal bucket).

Rules:
- A card is in exactly one stage.
- New cards default to Wishlist unless the user picks a stage at creation.
- Stages are display order left→right on the board.
- No WIP limits, no automation between stages.

### 7.3 Behaviour of each operation (incl. states)

**Add**
- Trigger: "Add application" button (visible on board, incl. empty state).
- UI: modal or dedicated form with the fields above.
- *Loading:* submit control shows a pending state; form is not double-submittable.
- *Success:* form closes, card appears in its stage, focus returns sensibly.
- *Error (validation):* inline field errors, form stays open, entered data
  preserved.
- *Error (server/network):* non-destructive error banner, user can retry; no
  duplicate cards created on retry.

**View (board)**
- *Loading:* skeleton columns/cards.
- *Empty (account-level):* full-screen friendly empty state + primary CTA.
- *Empty (column-level):* placeholder text in the column.
- *Populated:* cards grouped by stage with counts.
- *Error:* error state with retry; do not show a blank board.

**Move**
- Trigger: drag-drop across columns, or explicit stage selector.
- *Optimistic:* card moves immediately.
- *Success:* persisted; `updatedAt` bumped.
- *Error:* revert to original column + error toast.
- Touch/mobile must have a non-drag path to move (e.g. stage dropdown).

**Edit**
- Trigger: click card → detail/edit; or edit control on card.
- Same validation and loading/error handling as Add.
- *Success:* board reflects updated fields.
- *Concurrency (assumption):* last write wins for a single user; not a
  multi-device conflict concern in MVP.

**Delete**
- Trigger: delete control on card/detail.
- *Confirmation:* required, names the application, warns it's permanent.
- *Success:* card removed immediately.
- *Error:* card remains, error shown; state stays consistent.

### 7.4 Cross-cutting UI states summary

| State | Every relevant surface must handle it |
|-------|----------------------------------------|
| **Loading** | Board load, add/edit submit, move, delete. Skeletons/spinners; disable double actions. |
| **Empty** | Account-level (no apps) and column-level (no apps in a stage). |
| **Error** | Auth failures, load failures, save/move/delete failures — always visible, always recoverable (retry or revert). |
| **Success** | Immediate, visible reflection of the change; optional lightweight confirmation. |

---

## 8. Non-Functional Requirements

### 8.1 Authorization & data isolation (critical)

- **A user can only ever see, edit, move, or delete their own applications.**
  This is enforced **server-side** on every read and write — ownership is
  derived from the authenticated session, never from a client-supplied
  `ownerId`.
- Requesting another user's application by `id` (view/edit/move/delete) returns
  a not-found/forbidden response — never that user's data, and without
  confirming the record exists.
- All application endpoints require authentication; unauthenticated requests are
  rejected (401) and the UI redirects to login.
- Passwords are stored only as salted hashes; never logged or returned.
- Standard baseline: HTTPS in production, secure/httpOnly session handling,
  protection against CSRF (for cookie sessions) and basic input sanitization to
  prevent XSS in user-entered fields (company, notes, etc.).

### 8.2 Performance

- Board initial load returns and renders within **~2s** on a typical broadband
  connection for an account with up to ~200 applications.
- Add / edit / move / delete feel instant: UI reflects the change in **<200ms**
  (optimistic), with server confirmation typically **<500ms**.
- The app remains usable (no visible jank) up to ~500 applications on one
  account.

### 8.3 Accessibility

- Target **WCAG 2.1 AA** for MVP core flows.
- All actions (add, edit, move, delete) are **keyboard-operable**; drag-and-drop
  must have a keyboard/non-pointer alternative.
- Proper labels on all form fields; errors announced to assistive tech
  (`aria-live` / associated error text).
- Color is never the only signal of stage or state; sufficient contrast ratios.
- Focus is managed on modal open/close and after create/delete.

### 8.4 Responsive behaviour

- Works on **phone, tablet, and desktop** browsers.
- Desktop: multi-column board visible side by side.
- Mobile: board adapts (e.g. horizontally scrollable columns or a stacked
  per-stage view); moving a card must work with touch (non-drag fallback).
- No horizontal page overflow; tap targets meet minimum size guidance.

### 8.5 Reliability & data integrity

- No user action results in silent data loss; failed writes are surfaced and
  reversible in the UI.
- Data persists across sessions and devices for the same account.

### 8.6 Browser support (assumption)

- Latest two major versions of Chrome, Safari, Firefox, and Edge. Confirm if
  broader support is needed.

---

## 9. Success Metrics

How we'll know the MVP works. (Targets are hypotheses to validate, not
commitments.)

**Activation**
- % of sign-ups who add **≥1 application** within their first session. *Target:
  ≥ 70%.*
- % of new users who add **≥3 applications** within 7 days (signal the tool is
  actually being adopted, not just tried). *Target: ≥ 40%.*

**Core-loop engagement**
- % of active users who **move at least one card between stages** within 7 days
  (proves the pipeline, not just a static list, is valued). *Target: ≥ 50%.*
- Median **time to add an application** (from "Add" click to saved). *Target:
  < 30s.*

**Retention**
- % of users who return and update their board in **week 2**. *Target: ≥ 30%.*

**Reliability / quality**
- Add/edit/move/delete **success rate** (non-error). *Target: ≥ 99%.*
- Board load **error rate**. *Target: < 1%.*
- **Zero** cross-user data-leak incidents (a release blocker, not a target).

**Qualitative**
- Post-use micro-survey or interviews: users report it replaced their previous
  method (spreadsheet/notes). *Directional target: majority say yes.*

---

## 10. Release Checklist (MVP definition of done)

- [ ] Sign up, log in, log out working; sessions enforced on all app routes.
- [ ] Add / view (board) / move / edit / delete all functional end-to-end.
- [ ] Empty, loading, and error states implemented on every surface in §7.4.
- [ ] Server-side ownership checks verified on every application endpoint
      (incl. negative tests for another user's `id`).
- [ ] Responsive on phone + desktop; card move works on touch.
- [ ] Keyboard-operable core flows; form labels + error announcements.
- [ ] Destructive delete confirmation in place.
- [ ] Open questions Q1–Q7 resolved and reflected in scope.

---

## 11. Appendix — Decisions to confirm before build

**Resolved (2026-07-04):**

1. ✅ **Board only** for MVP; list view is Later. (Q1)
2. ✅ **Password reset is in** MVP, minimal. (Q3)
3. ✅ **Hard delete + confirmation.** (Q5)

**Still assumed — confirm if you disagree:**

4. No email verification at sign-up. (Q2)
5. Include a single `notes` field. (Q4)
6. Show per-stage card counts. (Q6)
7. Only `dateApplied` date field; no interview-date tracking. (Q7)
8. Password policy: min 8 chars.
9. Browser support: latest two versions of major browsers.
