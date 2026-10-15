import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, toJson } from "../lib/export";
import type { Finding } from "@anomaly/detector";

const f = (over: Partial<Finding>): Finding => ({ rank: 1, lineNo: 3, text: "ERROR x", severity: "high", reason: "rule", ruleId: null, score: 0.8, detail: "d", occurrences: 1, ...over });

test("csv quotes, escapes and neutralises formulas", () => {
  const csv = toCsv([f({ text: 'say "hi", ok' }), f({ rank: 2, text: "=HYPERLINK(\"http://x\")" })]);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], "rank,line,severity,reason,score,text,detail");
  assert.ok(lines[1].includes('"say ""hi"", ok"'));
  assert.ok(lines[2].includes(`"'=HYPERLINK(""http://x"")"`));
});

test("json export keeps metadata and findings", () => {
  const j = JSON.parse(toJson({ scanId: "a", lineCount: 10, flaggedCount: 1 }, [f({})]));
  assert.equal(j.scanId, "a");
  assert.equal(j.findings.length, 1);
});
