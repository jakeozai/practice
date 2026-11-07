/** Common shape every source adapter returns (spec §7). */
export type SourcePosting = {
  external_id: string;
  url: string;
  title: string;
  location_raw: string | null;
  /** Plain text. Stored in raw_postings.body only; never shown to users (CLAUDE.md rule 1). */
  body: string;
};

/** Source kinds with a working adapter. `page` (robots.txt-checked pages) is not built yet. */
export const FETCHABLE_KINDS = ["greenhouse", "lever", "ashby", "recruitee"] as const;
export type FetchableKind = (typeof FETCHABLE_KINDS)[number];

export function isFetchableKind(kind: string): kind is FetchableKind {
  return (FETCHABLE_KINDS as readonly string[]).includes(kind);
}

/** Board token / company slug. Restricted so it can be placed in a URL safely. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/i;
