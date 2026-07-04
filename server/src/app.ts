import "dotenv/config";
import express from "express";
import session from "express-session";
import { authRouter } from "./routes/auth.js";
import { applicationsRouter } from "./routes/applications.js";
import { errorHandler } from "./errors.js";

// Builds the Express app without starting a listener, so tests (supertest) and
// the server entrypoint (index.ts) can share the exact same configuration.
export function createApp() {
  const app = express();

  app.use(express.json());

  // Cookie session (httpOnly, SameSite=Lax). Uses the default in-memory store
  // in dev; swap for a persistent store before deploy (TECH_PLAN O2).
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

  app.use("/api/auth", authRouter);
  app.use("/api/applications", applicationsRouter);

  // Error handler must be registered last.
  app.use(errorHandler);

  return app;
}
