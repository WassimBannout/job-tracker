import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { createApp } from "../app.js";
import { prisma } from "../db.js";

// Integration tests run against a dedicated SQLite db (see the `test` script,
// which points DATABASE_URL at test.db and applies migrations first).

const app = createApp();

async function reset() {
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();
}

// Returns a supertest agent that keeps the session cookie across requests.
async function signInAs(email: string): Promise<TestAgent> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/signup")
    .send({ email, password: "password123" })
    .expect(201);
  return agent;
}

const sampleApp = { company: "Acme", role: "Engineer" };

beforeEach(reset);
after(async () => {
  await prisma.$disconnect();
});

// --- happy paths -------------------------------------------------------------

test("create then list returns the user's application", async () => {
  const alex = await signInAs("alex@example.com");

  const created = await alex
    .post("/api/applications")
    .send(sampleApp)
    .expect(201);
  assert.equal(created.body.application.company, "Acme");
  assert.equal(created.body.application.stage, "Wishlist"); // default

  const list = await alex.get("/api/applications").expect(200);
  assert.equal(list.body.applications.length, 1);
  assert.equal(list.body.applications[0].id, created.body.application.id);
});

test("PATCH moves an application to a new stage", async () => {
  const alex = await signInAs("alex@example.com");
  const { body } = await alex.post("/api/applications").send(sampleApp);
  const id = body.application.id;

  const moved = await alex
    .patch(`/api/applications/${id}`)
    .send({ stage: "Interviewing" })
    .expect(200);
  assert.equal(moved.body.application.stage, "Interviewing");
  assert.equal(moved.body.application.company, "Acme"); // untouched
});

test("DELETE removes the application (then 404)", async () => {
  const alex = await signInAs("alex@example.com");
  const { body } = await alex.post("/api/applications").send(sampleApp);
  const id = body.application.id;

  await alex.delete(`/api/applications/${id}`).expect(204);
  await alex.get(`/api/applications/${id}`).expect(404);
});

test("create accepts null optionals; PATCH can edit and clear a field", async () => {
  const alex = await signInAs("alex@example.com");

  const created = await alex
    .post("/api/applications")
    .send({ ...sampleApp, notes: "call recruiter", location: null })
    .expect(201);
  const id = created.body.application.id;
  assert.equal(created.body.application.notes, "call recruiter");
  assert.equal(created.body.application.location, null);

  // Edit a field and clear another via null.
  const edited = await alex
    .patch(`/api/applications/${id}`)
    .send({ role: "Staff Engineer", notes: null })
    .expect(200);
  assert.equal(edited.body.application.role, "Staff Engineer");
  assert.equal(edited.body.application.notes, null);
  assert.equal(edited.body.application.company, "Acme"); // untouched
});

// --- validation & auth -------------------------------------------------------

test("create with missing required fields is 400 with field errors", async () => {
  const alex = await signInAs("alex@example.com");
  const res = await alex
    .post("/api/applications")
    .send({ company: "" })
    .expect(400);
  assert.equal(res.body.error.code, "VALIDATION");
  assert.ok(res.body.error.fields.company);
  assert.ok(res.body.error.fields.role);
});

test("unauthenticated requests are rejected with 401", async () => {
  await request(app).get("/api/applications").expect(401);
  await request(app).post("/api/applications").send(sampleApp).expect(401);
});

// --- cross-user isolation (release-blocking, PRD §8.1) -----------------------

test("a user cannot read, edit, or delete another user's application", async () => {
  const alex = await signInAs("alex@example.com");
  const beth = await signInAs("beth@example.com");

  const { body } = await alex.post("/api/applications").send(sampleApp);
  const id: string = body.application.id;

  // Beth is fully authenticated but must not touch Alex's record.
  await beth.get(`/api/applications/${id}`).expect(404);
  await beth
    .patch(`/api/applications/${id}`)
    .send({ stage: "Rejected" })
    .expect(404);
  await beth.delete(`/api/applications/${id}`).expect(404);

  // Beth's list never includes Alex's application.
  const bethList = await beth.get("/api/applications").expect(200);
  assert.equal(bethList.body.applications.length, 0);

  // And Alex's record is unchanged after Beth's attempts.
  const alexView = await alex.get(`/api/applications/${id}`).expect(200);
  assert.equal(alexView.body.application.stage, "Wishlist");
});
