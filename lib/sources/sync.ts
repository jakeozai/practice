/**
 * What one fetch of a source changes (spec §7 steps 2–3). Pure, so the
 * worker only does I/O.
 */
import { bodyHash } from "./text";
import type { SourcePosting } from "./types";

/** Consecutive runs a posting must be missing before its job is closed (spec §7). */
export const MISSING_CLOSE_THRESHOLD = 2;

export type ExistingRaw = {
  id: string;
  external_id: string;
  body_hash: string;
  url: string;
  title: string | null;
  location_raw: string | null;
};

export type RawUpsert = SourcePosting & { body_hash: string };

export function planSync(existing: ExistingRaw[], fetched: SourcePosting[]) {
  const byExternal = new Map(existing.map((e) => [e.external_id, e]));
  const fetchedIds = new Set<string>();
  const upserts: RawUpsert[] = [];
  const seenRawIds: string[] = [];

  for (const p of fetched) {
    if (fetchedIds.has(p.external_id)) continue;
    fetchedIds.add(p.external_id);
    const hash = bodyHash(p.body);
    const prev = byExternal.get(p.external_id);
    if (prev) seenRawIds.push(prev.id);
    const changed =
      !prev || prev.body_hash !== hash || prev.url !== p.url || prev.title !== p.title || prev.location_raw !== p.location_raw;
    if (changed) upserts.push({ ...p, body_hash: hash });
  }

  const missingRawIds = existing.filter((e) => !fetchedIds.has(e.external_id)).map((e) => e.id);
  return { upserts, seenRawIds, missingRawIds, newCount: upserts.filter((u) => !byExternal.has(u.external_id)).length };
}

/** missing_count after one more miss, and whether that closes the job. */
export function nextMissing(missingCount: number): { missing_count: number; close: boolean } {
  const n = missingCount + 1;
  return { missing_count: n, close: n >= MISSING_CLOSE_THRESHOLD };
}
