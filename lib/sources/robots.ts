/**
 * Minimal robots.txt evaluation (CLAUDE.md rule 11): pick the group for our
 * bot (else `*`), then the longest matching Allow/Disallow wins; ties go to
 * Allow. Supports `*` wildcards and `$` end anchors.
 */
export const BOT_NAME = "AIJob5Bot";

type Rule = { allow: boolean; pattern: string };

function parseGroups(robots: string): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent) agents = [];
      agents.push(value.toLowerCase());
      for (const a of agents) if (!groups.has(a)) groups.set(a, []);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if ((key === "allow" || key === "disallow") && agents.length) {
      if (key === "disallow" && value === "") continue; // "Disallow:" = allow all
      for (const a of agents) groups.get(a)!.push({ allow: key === "allow", pattern: value });
    }
  }
  return groups;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

/** Is `url` allowed for our bot under this robots.txt? Empty/missing robots.txt allows everything. */
export function robotsAllows(robots: string, url: string, bot = BOT_NAME): boolean {
  const groups = parseGroups(robots);
  const rules = groups.get(bot.toLowerCase()) ?? groups.get("*") ?? [];
  const u = new URL(url);
  const path = u.pathname + u.search;
  let best: Rule | null = null;
  for (const r of rules) {
    if (!r.pattern || !matches(r.pattern, path)) continue;
    if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}
