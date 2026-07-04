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

// Payload for creating/editing an application. The form sends null for emptied
// optional fields (so edits can clear them); the server accepts null or absent.
export type ApplicationInput = {
  company: string;
  role: string;
  stage: Stage;
  jobUrl: string | null;
  location: string | null;
  dateApplied: string | null;
  notes: string | null;
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
    mutationFn: (input: ApplicationInput) =>
      api
        .post<{ application: Application }>("/api/applications", input)
        .then((res) => res.application),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplicationInput }) =>
      api
        .patch<{ application: Application }>(`/api/applications/${id}`, input)
        .then((res) => res.application),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}
