import type { RequestHandler } from "express";
import { AppError } from "../errors.js";

// Augment the session with our own fields. `userId` is set on login/signup
// (Slice 2) and is the sole basis for identifying the current user — request
// bodies never carry an ownerId (TECH_PLAN §5).
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Rejects unauthenticated requests with 401. On success, `req.session.userId`
// is guaranteed present; downstream handlers scope every query to it.
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) {
    throw new AppError(401, "UNAUTHENTICATED", "You must be logged in.");
  }
  next();
};
