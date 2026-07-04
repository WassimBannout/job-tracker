import "dotenv/config";
import express from "express";
import session from "express-session";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./errors.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// Cookie session (httpOnly, SameSite=Lax). Uses the default in-memory store in
// dev; swap for a persistent store before deploy (TECH_PLAN O2).
app.use(
  session({
    name: "jt.sid",
    secret: process.env.SESSION_SECRET ?? "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Temporary probe that the auth middleware works. Real routes arrive in Slice 2.
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ userId: req.session.userId });
});

// Error handler must be registered last.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
