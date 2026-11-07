/** Fetch wrapper for collectors: identifying User-Agent, timeout, retry on 429/5xx/network errors. */
export const SOURCE_TIMEOUT_MS = 30_000;
export const SOURCE_MAX_ATTEMPTS = 3;

export class SourceFetchError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "SourceFetchError";
  }
}

/** `AIJob5Bot/0.1 (+{APP_URL}/bot)` per spec §7. */
export function botUserAgent(appUrl: string | undefined): string {
  return `AIJob5Bot/0.1 (+${(appUrl ?? "https://example.com").replace(/\/+$/, "")}/bot)`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(
  url: string,
  opts: { userAgent: string; timeoutMs?: number; attempts?: number; fetchImpl?: typeof fetch } = {
    userAgent: botUserAgent(undefined),
  },
): Promise<unknown> {
  const attempts = opts.attempts ?? SOURCE_MAX_ATTEMPTS;
  const doFetch = opts.fetchImpl ?? fetch;
  let last: SourceFetchError | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await doFetch(url, {
        headers: { "user-agent": opts.userAgent, accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? SOURCE_TIMEOUT_MS),
      });
      if (res.ok) return await res.json();
      last = new SourceFetchError(`HTTP ${res.status} for ${url}`, res.status);
      if (res.status !== 429 && res.status < 500) throw last; // 404 etc.: retrying won't help
    } catch (e) {
      if (e instanceof SourceFetchError && e.status !== null && e.status !== 429 && e.status < 500) throw e;
      last = e instanceof SourceFetchError ? e : new SourceFetchError(`${(e as Error).message} for ${url}`, null);
    }
    if (attempt < attempts) await sleep(1000 * 2 ** (attempt - 1));
  }
  throw last ?? new SourceFetchError(`Failed to fetch ${url}`, null);
}
