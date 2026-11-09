/**
 * Turns one raw posting (+ optional LLM extraction) into a jobs row and a
 * review decision (spec §8 steps 3 and 5). Pure.
 */
import { decideKoreaEligible, koreaEligibleFromLocation } from "../eligibility";
import { decideStatus } from "../status";
import { isScamRejected, scamScore } from "../scam";
import { normalizeTitle } from "./format";
import { matchesJobKeywords } from "./keywords";
import type { JobExtract } from "../llm/extractJob";
import type { Database } from "../supabase/database.types";

type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

export type RawForProcessing = {
  id: string;
  url: string;
  title: string | null;
  location_raw: string | null;
  body: string | null;
};

export type SourceInfo = { name: string; trusted: boolean };

/**
 * Before any LLM call (cost rule 10):
 * - no keyword → not an AI gig, skip
 * - location rule says a Korea resident can't apply → skip (the rule would
 *   override any LLM answer anyway, so the call would be wasted)
 */
export function triage(raw: RawForProcessing): "skip_keyword" | "skip_region" | "candidate" {
  if (!matchesJobKeywords(raw.title ?? "", raw.body ?? "")) return "skip_keyword";
  if (koreaEligibleFromLocation(raw.location_raw) === false) return "skip_region";
  return "candidate";
}

export function buildJob(input: {
  raw: RawForProcessing;
  source: SourceInfo;
  extraction: JobExtract | null;
  /** Same company + normalized title first seen in the repost window, counting this posting. */
  sameTitleCount: number;
}): JobInsert {
  const { raw, source, extraction: x, sameTitleCount } = input;
  const title = x?.title || raw.title?.trim() || "(제목 없음)";
  const company = x?.company || source.name;
  const korea = decideKoreaEligible(raw.location_raw, x?.korea_eligible);
  const scam = scamScore(x?.scam_signals ?? []);
  const requiresCredential = x?.requires_credential ?? false;

  // Out of scope: not work that needs AI, or open-ended staff hiring (덕잡 sends short-term work).
  // Credentials and work language are information only; they don't block.
  const outOfScope = x !== null && (!x.ai_related || x.engagement === "permanent");

  let review: JobInsert["review_state"] = "pending";
  if (isScamRejected(scam) || outOfScope) review = "rejected";
  else if (x && source.trusted && korea === true && scam === 0) review = "approved";

  return {
    raw_posting_id: raw.id,
    company,
    title,
    title_normalized: normalizeTitle(title),
    url: raw.url,
    summary_ko: x?.summary_ko ?? [],
    category: x?.category ?? null,
    languages: x?.languages ?? [],
    requires_credential: requiresCredential,
    korea_eligible: korea,
    eligibility_note: x?.location_raw ?? raw.location_raw,
    pay_min: x?.pay_min ?? null,
    pay_max: x?.pay_max ?? null,
    pay_currency: x && (x.pay_min !== null || x.pay_max !== null) ? (x.pay_currency ?? "USD") : null,
    pay_unit: x?.pay_unit ?? null,
    hours_per_week_min: x?.hours_per_week_min ?? null,
    english_level: x?.english_level ?? null,
    engagement: x?.engagement ?? null,
    status: decideStatus({ isTalentPool: x?.is_talent_pool ?? false, sameTitleCount }),
    repost_count: Math.max(0, sameTitleCount - 1),
    scam_score: scam,
    review_state: review,
  };
}
