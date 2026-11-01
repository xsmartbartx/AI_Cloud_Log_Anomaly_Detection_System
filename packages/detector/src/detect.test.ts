import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detect, detectFormat, redact, shapeOf, InputError, LIMITS } from "./index.ts";

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

test("5xx rule needs an HTTP or status context, not any 5xx-looking number (review)", () => {
  const base = Array.from({ length: 30 }, (_, i) => `2026-10-13T10:00:${String(i).padStart(2, "0")}Z INFO ok ${i}ms`);
  const flagged = (line: string) => detect([...base, line].join("\n")).findings.some((f) => f.text.includes(line.slice(0, 20)) && f.reason === "rule");
  assert.equal(flagged("processed 500 items for batch"), false);
  assert.equal(flagged("queue length 503 and growing"), false);
  assert.equal(flagged('"GET /api/orders HTTP/1.1" 502 1234'), true);
  assert.equal(flagged("upstream replied status=503 after 2s"), true);
  assert.equal(flagged("response status: 500"), true);
});

test("shape masking keeps working without lookbehind (review)", () => {
  assert.equal(shapeOf("took 12ms for 3 items, x10 stays, v2"), "took <n>ms for <n> items, x10 stays, v2");
  assert.equal(shapeOf("1 2 3"), "<n> <n> <n>");
  assert.equal(shapeOf("a1.5 b 7.25"), "a1.<n> b <n>"); // same as before the change
  // Safari before 16.4 cannot parse lookbehind, and this module loads in the browser.
  assert.ok(!/\(\?<[!=]/.test(readFileSync(new URL("./index.ts", import.meta.url), "utf8")), "no lookbehind in the detector source");
});

test("ignore patterns remove matching lines from findings (rule hits and outliers)", () => {
  const base = Array.from({ length: 40 }, (_, i) => `2026-10-13T10:00:${String(i).padStart(2, "0")}Z INFO ok ${i}ms`);
  const input = [...base, "WARN retrying health check (attempt 2)", "ERROR db connection refused to 10.0.0.1:5432", "weird handshake seen once zzz"].join("\n");
  const before = detect(input);
  assert.ok(before.findings.some((f) => f.text.includes("retrying health check")));
  assert.ok(before.findings.some((f) => f.text.includes("db connection refused")));

  const after = detect(input, { ignore: [{ test: (s: string) => /retrying health check/i.test(s) }] });
  assert.ok(!after.findings.some((f) => f.text.includes("retrying health check")), "ignored line is gone");
  assert.ok(after.findings.some((f) => f.text.includes("db connection refused")), "others stay");
  assert.equal(after.lineCount, before.lineCount, "line counts are unchanged");

  const outlierIgnored = detect(input, { ignore: [{ test: (s: string) => /handshake/.test(s) }] });
  assert.ok(!outlierIgnored.findings.some((f) => f.text.includes("handshake")));
});

// --- format auto-detect ---
const sec = (i: number) => `22:14:${String(i % 60).padStart(2, "0")}`;
const mixed = <T>(
  n: number,
  routine: (i: number) => T,
  varying: (i: number) => T,
) => Array.from({ length: n }, (_, i) => (i % 3 ? routine(i) : varying(i)));

test("detectFormat recognises json, access, syslog and plain", () => {
  const json = Array.from(
    { length: 20 },
    (_, i) => `{"level":"info","n":${i}}`,
  );
  const access = Array.from(
    { length: 20 },
    (_, i) =>
      `10.0.0.${i} - - [11/Oct/2026:${sec(i)} +0000] "GET /x HTTP/1.1" 200 5`,
  );
  const syslog = Array.from(
    { length: 20 },
    (_, i) => `Oct 11 ${sec(i)} web1 sshd[${900 + i}]: session opened`,
  );
  assert.equal(detectFormat(json), "json");
  assert.equal(detectFormat(access), "access");
  assert.equal(detectFormat(syslog), "syslog");
  assert.equal(detectFormat(noisy(20)), "plain");
  assert.equal(detectFormat([]), "plain");
});

test("detectFormat needs 60% of lines to match", () => {
  const lines = [
    ...Array.from({ length: 5 }, (_, i) => `{"n":${i}}`),
    ...Array.from({ length: 5 }, () => "plain text"),
  ];
  assert.equal(detectFormat(lines), "plain");
});

test("nginx lines with distinct user ids and paths are not outliers", () => {
  const lines = mixed(
    300,
    () =>
      `10.0.0.1 - - [11/Oct/2026:22:14:01 +0000] "GET /health HTTP/1.1" 200 512 "-" "curl/8"`,
    (i) =>
      `10.0.0.${i % 250} - - [11/Oct/2026:${sec(i)} +0000] "GET /users/user${i}/profile HTTP/1.1" 200 512 "-" "curl/8"`,
  );
  const r = detect(lines.join("\n"));
  assert.equal(r.format, "access");
  assert.equal(r.findings.length, 0);
});

test("syslog lines with distinct pids and ids are not outliers, a rare one still is", () => {
  const lines = mixed(
    300,
    (i) => `Oct 11 ${sec(i)} web1 sshd[${900 + i}]: session opened`,
    (i) =>
      `Oct 11 ${sec(i)} web1 sshd[${900 + i}]: accepted key for deploy${i} from host`,
  );
  lines.push("Oct 11 22:15:00 web1 kernel: weird handshake zzz");
  const r = detect(lines.join("\n"));
  assert.equal(r.format, "syslog");
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].text, /handshake/);
});

test("json logs: per-line ids do not create outliers, an error level is a rule hit", () => {
  const lines = mixed(
    300,
    () =>
      `{"ts":"2026-10-11T22:14:01Z","level":"info","msg":"request ok","req":"r1x"}`,
    (i) =>
      `{"ts":"2026-10-11T22:14:${i % 60}Z","level":"info","msg":"user u${i} loaded","req":"r${i}x"}`,
  );
  lines.push(
    `{"ts":"2026-10-11T22:15:00Z","level":"error","msg":"db connection refused"}`,
  );
  const r = detect(lines.join("\n"));
  assert.equal(r.format, "json");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].reason, "rule");
});

test("a json line with a different key set is an outlier", () => {
  const lines = Array.from(
    { length: 100 },
    (_, i) => `{"level":"info","msg":"ok","n":${i}}`,
  );
  lines.push(`{"level":"info","msg":"ok","n":1,"debug_dump":"x"}`);
  const r = detect(lines.join("\n"));
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].reason, "outlier");
});

test("free text keeps identifiers like v2 and x10 in the shape", () => {
  assert.equal(
    shapeOf("took 12ms for 3 items, x10 stays, v2"),
    "took <n>ms for <n> items, x10 stays, v2",
  );
});
