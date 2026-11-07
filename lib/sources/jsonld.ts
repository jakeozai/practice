/**
 * schema.org JobPosting from a page's JSON-LD — the structured data sites
 * publish for Google Jobs. Reading it avoids scraping page layout.
 */
import { htmlToText } from "./text";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function findJobPosting(html: string): Obj | null {
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : isObj(data) && Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    for (const it of items) {
      if (isObj(it) && asArray(it["@type"]).includes("JobPosting")) return it;
    }
  }
  return null;
}

function placeName(p: unknown): string | null {
  if (typeof p === "string") return str(p);
  if (!isObj(p)) return null;
  if (str(p.name)) return str(p.name);
  const addr = isObj(p.address) ? p.address : null;
  if (!addr) return null;
  const country = isObj(addr.addressCountry) ? str(addr.addressCountry.name) : str(addr.addressCountry);
  return [str(addr.addressLocality), str(addr.addressRegion), country].filter(Boolean).join(", ") || null;
}

/**
 * Location text for the eligibility rules. applicantLocationRequirements is
 * the explicit "who may apply" list, so it wins over the office location.
 */
export function jobPostingLocation(job: Obj): string | null {
  const allowed = asArray(job.applicantLocationRequirements).map(placeName).filter((s): s is string => Boolean(s));
  const remote = asArray(job.jobLocationType).some((t) => t === "TELECOMMUTE");
  if (allowed.length) return [...new Set(allowed)].join(" / ") + (remote ? " / Remote" : "");
  const places = asArray(job.jobLocation).map(placeName).filter((s): s is string => Boolean(s));
  const parts = [...new Set(places)];
  if (remote) parts.push("Remote");
  return parts.length ? parts.join(" / ") : null;
}

function salaryText(job: Obj): string | null {
  const s = isObj(job.baseSalary) ? job.baseSalary : null;
  if (!s) return null;
  const v = isObj(s.value) ? s.value : null;
  const currency = str(s.currency) ?? "";
  if (!v) return null;
  const range = v.minValue !== undefined && v.maxValue !== undefined ? `${v.minValue}-${v.maxValue}` : String(v.value ?? "");
  return range ? `Pay: ${range} ${currency} per ${String(v.unitText ?? "").toLowerCase() || "unit"}` : null;
}

export function jobPostingToText(job: Obj): { title: string | null; body: string } {
  const lines = [
    htmlToText(str(job.description) ?? ""),
    salaryText(job),
    str(job.employmentType) ? `Employment type: ${job.employmentType}` : null,
    str(job.datePosted) ? `Posted: ${job.datePosted}` : null,
    str(job.validThrough) ? `Apply by: ${job.validThrough}` : null,
  ].filter(Boolean);
  return { title: str(job.title), body: lines.join("\n\n") };
}
