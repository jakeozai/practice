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

export function chunks<T>(xs: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
}
