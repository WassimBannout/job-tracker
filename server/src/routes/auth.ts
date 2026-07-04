import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { AppError } from "../errors.js";
import { loginSchema, signupSchema } from "../schemas.js";

export const authRouter = Router();

// Shape of the user we return to the client — never the password hash.
function publicUser(user: { id: string; email: string }) {
  return { id: user.id, email: user.email };
}

// POST /api/auth/signup — create an account and start a session.
authRouter.post("/signup", async (req, res) => {
  const { email, password } = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Non-enumerating: don't confirm the email exists (PRD §6 A1 / §8.1).
    throw new AppError(
      409,
      "CONFLICT",
      "That email can’t be used. Try logging in instead.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

// POST /api/auth/login — authenticate and start a session.
authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Compare against a hash even when the user is missing so timing doesn't
  // reveal whether the account exists.
  const ok = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !ok) {
    throw new AppError(401, "UNAUTHENTICATED", "Email or password is incorrect.");
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout — end the session.
authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("jt.sid");
    res.status(204).end();
  });
});

// GET /api/auth/me — current user for client bootstrap / route guards.
authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    res.json({ user: null });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
  });
  res.json({ user: user ? publicUser(user) : null });
});

// A valid bcrypt hash of a throwaway value, used only to equalize timing on
// unknown emails so login doesn't leak whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 12);
