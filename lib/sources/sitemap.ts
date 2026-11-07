import { decodeEntities } from "./text";

/** `<loc>` entries of a sitemap or sitemap index, and whether it is an index. */
export function parseSitemap(xml: string): { isIndex: boolean; locs: string[] } {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]).trim());
  return { isIndex, locs };
}

/** Canonical form for comparing and storing job URLs: no query/hash, no trailing slash. */
export function canonicalUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  u.search = "";
  return u.toString().replace(/\/+$/, "");
}
