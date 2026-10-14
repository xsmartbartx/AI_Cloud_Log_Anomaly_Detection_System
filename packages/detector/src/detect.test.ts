import { test } from "node:test";
import assert from "node:assert/strict";
import { detect, redact, shapeOf, InputError, LIMITS } from "./index.ts";

const noisy = (n: number) =>
  Array.from({ length: n }, (_, i) => `2026-10-13T10:00:${String(i % 60).padStart(2, "0")}Z INFO GET /health 200 ${i}ms`);

test("shape masks timestamps, numbers and ips", () => {
  assert.equal(shapeOf("2026-10-13T10:00:01Z conn from 10.0.0.5:443 took 12ms"), "<ts> conn from <ip> took <n>ms");
});

test("rule hit outranks outlier and is first", () => {
  const lines = [...noisy(100), "FATAL: out of memory, killed process 88", "weird handshake token seen once zzz"];
  const r = detect(lines.join("\n"));
  assert.equal(r.findings[0].severity, "critical");
  assert.equal(r.findings[0].reason, "rule");
  assert.ok(r.findings.some((f) => f.reason === "outlier" && f.text.includes("handshake")));
});

test("clean repetitive logs yield no findings", () => {
  assert.equal(detect(noisy(200).join("\n")).findings.length, 0);
});

test("dedupes repeated shapes and caps at ten", () => {
  const errs = Array.from({ length: 50 }, (_, i) => `ERROR job ${i} failed`);
  const r = detect([...noisy(50), ...errs].join("\n"));
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].occurrences, 50);
  const many = Array.from({ length: 30 }, (_, i) => `ERROR unique${"x".repeat(i + 1)} thing${"y".repeat(i)} z`);
  assert.equal(detect(many.join("\n")).findings.length <= LIMITS.topN, true);
});

test("deterministic", () => {
  const input = [...noisy(60), "Connection refused to 10.0.0.1:5432", "unauthorized request"].join("\n");
  assert.deepEqual(detect(input, { now: () => 0 }), detect(input, { now: () => 0 }));
});

test("redacts secrets in output", () => {
  const r = detect(["ERROR auth failed Authorization: Bearer abcdef1234567890", ...noisy(20)].join("\n"));
  assert.ok(!r.findings[0].text.includes("abcdef1234567890"));
  assert.equal(redact("password=hunter2 ok"), "password=[redacted] ok");
});

test("input limits", () => {
  assert.throws(() => detect("   \n"), (e) => e instanceof InputError && e.code === "empty");
  assert.throws(() => detect("x\n".repeat(LIMITS.maxLines + 1)), (e) => e instanceof InputError && e.code === "too_many_lines");
});

test("authorization headers keep their scheme and mask only the secret (BUG-002)", () => {
  assert.equal(redact("Authorization: Bearer abcdef1234567890"), "Authorization: Bearer [redacted]");
  assert.equal(redact("authorization=Basic dXNlcjpwYXNz"), "authorization=Basic [redacted]");
});
