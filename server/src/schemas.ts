import { z } from "zod";

// Validation schemas — the single source of truth for field rules (PRD §7.1).
// The server is authoritative; these are written to be reusable by the client.

// ---- Pipeline stages (PRD §7.2) ---------------------------------------------

export const STAGES = [
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
] as const;

export const stageSchema = z.enum(STAGES);
export type Stage = z.infer<typeof stageSchema>;

// ---- Auth -------------------------------------------------------------------

const email = z.string().trim().toLowerCase().email("Enter a valid email.");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password is too long.");

export const signupSchema = z.object({ email, password });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---- Applications (PRD §7.1) ------------------------------------------------

const company = z.string().trim().min(1, "Company is required.").max(120);
const role = z.string().trim().min(1, "Role is required.").max(120);
const jobUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), "URL must start with http(s)://");
const location = z.string().trim().max(120);
const notes = z.string().trim().max(2000);
// Accept an ISO date (yyyy-mm-dd) or full datetime; coerce to a Date.
const dateApplied = z.coerce.date();

export const createApplicationSchema = z.object({
  company,
  role,
  stage: stageSchema.default("Wishlist"),
  // Optionals accept null as well as absent, so the same form payload works for
  // create and edit (edit sends null to clear a previously-set field).
  jobUrl: jobUrl.nullish(),
  location: location.nullish(),
  dateApplied: dateApplied.nullish(),
  notes: notes.nullish(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// Edit + move both go through PATCH: every field optional, but at least one
// must be present so an empty update is rejected.
export const updateApplicationSchema = z
  .object({
    company,
    role,
    stage: stageSchema,
    jobUrl: jobUrl.nullable(),
    location: location.nullable(),
    dateApplied: dateApplied.nullable(),
    notes: notes.nullable(),
  })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update.",
  );
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
