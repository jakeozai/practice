import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEED_SOURCES } from "./seeds";
import { SLUG_PATTERN } from "./types";

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations/0002_collection.sql"), "utf8");

test("every seed source is in the migration with the same values", () => {
  for (const s of SEED_SOURCES) {
    const row = `('${s.name}', '${s.kind}', '${s.endpoint}', ${s.trusted})`;
    assert.ok(sql.includes(row), `missing in 0002_collection.sql: ${row}`);
  }
  const rows = sql.match(/^\s+\('[^']+', '[a-z]+', '[^']+', (true|false)\)/gm) ?? [];
  assert.equal(rows.length, SEED_SOURCES.length, "migration has extra seed rows");
});

test("seed endpoints are unique and URL-safe", () => {
  const keys = SEED_SOURCES.map((s) => `${s.kind}:${s.endpoint}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const s of SEED_SOURCES) assert.match(s.endpoint, SLUG_PATTERN);
});
