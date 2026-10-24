import { test } from "node:test";
import assert from "node:assert/strict";
import RE2 from "re2";
import { suggestPattern } from "../lib/pattern";
import { validateIgnorePattern } from "../lib/ignore-validate";

const line = "2026-10-13T09:01:11Z ERROR db connection refused to 10.0.3.12:5432 after 3 retries";

test("suggested pattern matches the line and its siblings with other numbers", () => {
  const p = suggestPattern(line);
  const re = new RE2(p, "i");
  assert.ok(re.test(line));
  assert.ok(re.test("2026-10-14T11:22:33Z ERROR db connection refused to 10.9.9.9:5433 after 12 retries"));
  assert.ok(!re.test("2026-10-13T09:01:11Z ERROR cache miss for key"));
  assert.ok(p.length <= 200);
});

test("suggestion turns masked secrets into wildcards so it matches the raw line", () => {
  const p = suggestPattern("INFO auth Authorization: Bearer [redacted] rejected: invalid token");
  assert.ok(new RE2(p, "i").test("INFO auth Authorization: Bearer abcdef123456 rejected: invalid token"));
});

test("long lines still give a pattern within 200 characters that matches", () => {
  const long = "ERROR " + "very long message part ".repeat(30) + "end";
  const p = suggestPattern(long);
  assert.ok(p.length <= 200);
  assert.ok(new RE2(p, "i").test(long));
});

test("an ignore pattern must be specific, valid and not match everything", () => {
  assert.equal(validateIgnorePattern("ERROR db connection refused").ok, true);
  for (const bad of ["", ".*", "e", "abc", "(unclosed", "a".repeat(201), "\\s*", ".{0,5}"]) {
    assert.equal(validateIgnorePattern(bad).ok, false, JSON.stringify(bad));
  }
});

test("the browser-facing pattern module imports no native or server-only modules", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../lib/pattern.ts", import.meta.url), "utf8");
  assert.ok(!/from\s+["'](re2|node:|pg|@electric-sql)/.test(src), "lib/pattern.ts is imported by a client component");
});
