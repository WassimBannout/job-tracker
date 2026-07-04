import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

// Consistent API error shape (TECH_PLAN §4): { error: { code, message, fields? } }

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Flatten a ZodError into a { fieldName: firstMessage } map for the client.
function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

// Express 5 forwards thrown/rejected errors here. Keep last in the middleware chain.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, fields: err.fields },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION",
        message: "Some fields are invalid.",
        fields: fieldErrors(err),
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Something went wrong." },
  });
};
