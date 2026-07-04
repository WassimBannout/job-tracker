import { Router } from "express";
import { prisma } from "../db.js";
import { AppError } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../schemas.js";

export const applicationsRouter = Router();

// Every route below is scoped to the authenticated user. Ownership is part of
// the DB query (never a post-fetch check), and `ownerId` always comes from the
// session — never the request body (TECH_PLAN §5).
applicationsRouter.use(requireAuth);

// GET /api/applications — list the current user's applications (flat; the
// board groups by stage client-side). Newest first.
applicationsRouter.get("/", async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { ownerId: req.session.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ applications });
});

// POST /api/applications — create one owned by the current user.
applicationsRouter.post("/", async (req, res) => {
  const data = createApplicationSchema.parse(req.body);
  const application = await prisma.application.create({
    data: { ...data, ownerId: req.session.userId! },
  });
  res.status(201).json({ application });
});

// GET /api/applications/:id — read one; 404 if it isn't the user's.
applicationsRouter.get("/:id", async (req, res) => {
  const application = await findOwned(req.session.userId!, req.params.id);
  res.json({ application });
});

// PATCH /api/applications/:id — edit any field, including `stage` (this is also
// how a card "moves" between stages).
applicationsRouter.patch("/:id", async (req, res) => {
  const data = updateApplicationSchema.parse(req.body);
  await findOwned(req.session.userId!, req.params.id); // 404 if not owned
  const application = await prisma.application.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ application });
});

// DELETE /api/applications/:id — hard delete; 404 if not the user's.
applicationsRouter.delete("/:id", async (req, res) => {
  const result = await prisma.application.deleteMany({
    where: { id: req.params.id, ownerId: req.session.userId },
  });
  if (result.count === 0) throw notFound();
  res.status(204).end();
});

// --- helpers -----------------------------------------------------------------

function notFound() {
  return new AppError(404, "NOT_FOUND", "Application not found.");
}

// Fetches an application only if it belongs to the user; otherwise 404 (we
// never reveal that another user's record exists).
async function findOwned(ownerId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, ownerId },
  });
  if (!application) throw notFound();
  return application;
}
