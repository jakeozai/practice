/**
 * Where the subscriber stands with a job they got by mail (spec §15 Phase 3
 * "/me 지원 현황"). They apply on the original site; this is their own note.
 */
import { z } from "zod";

/** applications.status values a person can pick (drafted is for the English draft, not shown). */
export const APPLICATION_STATUSES = {
  applied: "지원함",
  assessment: "시험·과제 중",
  accepted: "합격",
  rejected: "불합격",
  paid: "돈 받음",
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUSES;

export const StatusFormSchema = z.object({
  jobId: z.uuid(),
  /** "" clears it. */
  status: z.union([z.enum(Object.keys(APPLICATION_STATUSES) as [ApplicationStatus, ...ApplicationStatus[]]), z.literal("")]),
});
