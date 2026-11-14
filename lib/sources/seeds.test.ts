import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEED_SOURCES } from "./seeds";
import { SLUG_PATTERN } from "./types";
import { PAGE_SITES } from "./pages";
import { FREELANCER_PRESETS } from "./freelancer";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

test("every seed source is in the migrations with the same values", () => {
  for (const s of SEED_SOURCES) {
    const row = `('${s.name}', '${s.kind}', '${s.endpoint}', ${s.trusted})`;
    assert.ok(sql.includes(row), `missing in migrations: ${row}`);
  }
  const rows = sql.match(/^\s+\('[^']+', '[a-z]+', '[^']+', (true|false)\)/gm) ?? [];
  assert.equal(rows.length, SEED_SOURCES.length, "migrations have seed rows that seeds.ts doesn't");
});

test("seed endpoints are unique and valid for their kind", () => {
  const keys = SEED_SOURCES.map((s) => `${s.kind}:${s.endpoint}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const s of SEED_SOURCES) {
    if (s.kind === "page") assert.ok(PAGE_SITES[s.endpoint], `no PAGE_SITES entry for ${s.endpoint}`);
    else if (s.kind === "freelancer") assert.ok(FREELANCER_PRESETS[s.endpoint], `no FREELANCER_PRESETS entry for ${s.endpoint}`);
    else assert.match(s.endpoint, SLUG_PATTERN);
  }
});
