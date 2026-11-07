/**
 * Collection sources found in the 2026-11-07 supply check
 * (docs/supply-check-2026-11-07.md). Mirrored by
 * supabase/migrations/0002_collection.sql; seeds.test.ts keeps them in sync.
 *
 * `trusted` = an established company's own hiring board. Only trusted
 * sources can be auto-approved, and only when the LLM extraction succeeded
 * and every rule passes (spec §8 step 5).
 */
import type { FetchableKind } from "./types";

export type SeedSource = { name: string; kind: FetchableKind; endpoint: string; trusted: boolean };

export const SEED_SOURCES: SeedSource[] = [
  // Boards that currently carry Korea-eligible AI gigs
  { name: "Invisible (Freelance AI Trainer)", kind: "greenhouse", endpoint: "agency", trusted: true },
  { name: "Welo Data", kind: "lever", endpoint: "weloglobal", trusted: true },
  { name: "RWS TrainAI", kind: "lever", endpoint: "rws", trusted: true },
  { name: "TransPerfect / DataForce", kind: "recruitee", endpoint: "transperfect", trusted: true },
  // Gig boards with no Korea postings today, watched for new projects
  { name: "Appen", kind: "lever", endpoint: "appen", trusted: true },
  { name: "xAI", kind: "greenhouse", endpoint: "xai", trusted: true },
  { name: "Toloka", kind: "greenhouse", endpoint: "toloka", trusted: true },
  { name: "Remotasks", kind: "greenhouse", endpoint: "remotasks", trusted: true },
  { name: "Scale AI", kind: "greenhouse", endpoint: "scaleai", trusted: true },
  { name: "Turing", kind: "greenhouse", endpoint: "turing", trusted: true },
  { name: "Labelbox (Alignerr)", kind: "greenhouse", endpoint: "labelbox", trusted: true },
  { name: "Prolific", kind: "greenhouse", endpoint: "prolific", trusted: true },
  { name: "Snorkel AI", kind: "greenhouse", endpoint: "snorkelai", trusted: true },
  { name: "Mercor", kind: "ashby", endpoint: "mercor", trusted: true },
  { name: "Handshake", kind: "ashby", endpoint: "handshake", trusted: true },
];
