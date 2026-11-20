/**
 * Shared bits for the jobs that run both from the CLI (workers/*.ts via tsx)
 * and from Vercel Cron (app/api/cron/*). A job gets a logger and an optional
 * deadline; long loops stop before the deadline and leave the rest for the
 * next run, so a cron invocation never hits the function time limit.
 */
export type Log = (line: string) => void;

export type RunOptions = {
  log: Log;
  /** Epoch ms after which the job stops starting new work. */
  deadline?: number;
};

export function pastDeadline(deadline: number | undefined, marginMs = 0): boolean {
  return deadline !== undefined && Date.now() + marginMs >= deadline;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight, in item
 * order. A throwing call does not stop the others; `fn` handles its own errors.
 */
export async function forEachConcurrent<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        await fn(items[i], i);
      } catch (e) {
        console.error(`forEachConcurrent item ${i}: ${e instanceof Error ? e.message : e}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
}

export function chunks<T>(xs: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
}
