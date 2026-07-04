import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// Mirrors the server pipeline stages (server/src/schemas.ts) and the
// Application shape returned by the API (dates arrive as ISO strings).

export const STAGES = [
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
] as const;

export type Stage = (typeof STAGES)[number];

export type Application = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  jobUrl: string | null;
  location: string | null;
  dateApplied: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// Payload for creating an application. Empty optional fields are omitted by the
// form before sending.
export type CreateApplicationInput = {
  company: string;
  role: string;
  stage: Stage;
  jobUrl?: string;
  location?: string;
  dateApplied?: string;
  notes?: string;
};

const APPLICATIONS_KEY = ["applications"] as const;

export function useApplications() {
  return useQuery({
    queryKey: APPLICATIONS_KEY,
    queryFn: () =>
      api
        .get<{ applications: Application[] }>("/api/applications")
        .then((res) => res.applications),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      api
        .post<{ application: Application }>("/api/applications", input)
        .then((res) => res.application),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}
