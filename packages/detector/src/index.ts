export type Severity = "critical" | "high" | "medium" | "low";

export type Matcher = { test(input: string): boolean };
export type Rule = { id: string; name: string; pattern: Matcher; severity: Severity };

export type Finding = {
  rank: number;
  lineNo: number;
  text: string;
  severity: Severity;
  reason: "rule" | "outlier";
  ruleId: string | null;
  score: number;
  detail: string;
  occurrences: number;
};

export type ScanResult = {
  lineCount: number;
  byteCount: number;
  findings: Finding[];
  durationMs: number;
};

export const LIMITS = { maxLines: 50_000, maxBytes: 5 * 1024 * 1024, topN: 10, maxLineChars: 2_000 } as const;

export class InputError extends Error {
  code: "empty" | "too_large" | "too_many_lines";
  constructor(code: "empty" | "too_large" | "too_many_lines", message: string) {
    super(message);
    this.code = code;
  }
}

export const BUILTIN_RULES: Rule[] = [
  { id: "oom", name: "Out of memory", pattern: /out of memory|\boom\b|oomkill|cannot allocate memory/i, severity: "critical" },
  { id: "fatal", name: "Fatal or panic", pattern: /\bfatal\b|\bpanic\b|segfault|segmentation fault|core dumped/i, severity: "critical" },
  { id: "auth", name: "Auth failure", pattern: /unauthori[sz]ed|forbidden|permission denied|access denied|invalid (token|credentials)|authentication failed/i, severity: "high" },
  { id: "conn", name: "Connection failure", pattern: /connection (refused|reset|timed out)|econnrefused|econnreset|no route to host|unreachable/i, severity: "high" },
  { id: "exception", name: "Exception or error", pattern: /\bexception\b|\berror\b|\bfailed\b|traceback|stack trace/i, severity: "medium" },
  { id: "timeout", name: "Timeout", pattern: /time(d)? ?out|deadline exceeded/i, severity: "medium" },
  { id: "http5xx", name: "Server error status", pattern: /\b(HTTP\/\d(\.\d)?"?\s+|status[=: ]+|\s)5\d\d\b/i, severity: "medium" },
  { id: "retry", name: "Retries or throttling", pattern: /\bretry(ing)?\b|rate limit|throttl|too many requests|\b429\b/i, severity: "low" },
  { id: "warn", name: "Warning", pattern: /\bwarn(ing)?\b|deprecated/i, severity: "low" },
];

const WEIGHT: Record<Severity, number> = { critical: 0.95, high: 0.8, medium: 0.6, low: 0.4 };

const SHAPE_MASKS: Array<[RegExp, string]> = [
  [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?\b/g, "<ts>"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>"],
  [/\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/g, "<ip>"],
  [/\b0x[0-9a-f]+\b/gi, "<hex>"],
  [/\b[0-9a-f]{16,}\b/gi, "<hex>"],
  [/(?<![a-z0-9_])\d+(\.\d+)?/gi, "<n>"],
];

export function shapeOf(line: string): string {
  let s = line.slice(0, LIMITS.maxLineChars);
  for (const [re, tok] of SHAPE_MASKS) s = s.replace(re, tok);
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const REDACTIONS: Array<[RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}/g, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted-jwt]"],
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, "[redacted-aws-key]"],
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[redacted-key]"],
  [/\b(authorization)(\s*[=:]\s*)(Basic|Token|Digest)\s+\S+/gi, "$1$2$3 [redacted]"],
  [/\b(password|passwd|pwd|secret|token|api[_-]?key)\b(\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi, "$1$2[redacted]"],
];

export function redact(text: string): string {
  let out = text;
  for (const [re, rep] of REDACTIONS) out = out.replace(re, rep);
  return out;
}

export type DetectOptions = { rules?: Rule[]; now?: () => number };

type Candidate = {
  lineNo: number;
  text: string;
  shape: string;
  severity: Severity;
  reason: "rule" | "outlier";
  rule: Rule | null;
  score: number;
  rarity: number;
};

/** Pure and deterministic: same input, same output. */
export function detect(input: string, opts: DetectOptions = {}): ScanResult {
  const now = opts.now ?? Date.now;
  const t0 = now();
  const byteCount = new TextEncoder().encode(input).length;
  if (byteCount > LIMITS.maxBytes) throw new InputError("too_large", "Sample is larger than 5 MB.");

  const rawLines = input.split(/\r?\n/);
  const lines: Array<{ no: number; text: string }> = [];
  rawLines.forEach((text, i) => {
    if (text.trim() !== "") lines.push({ no: i + 1, text });
  });
  if (lines.length === 0) throw new InputError("empty", "Paste at least one log line.");
  if (lines.length > LIMITS.maxLines) throw new InputError("too_many_lines", "Sample has more than 50,000 lines.");

  const rules = [...BUILTIN_RULES, ...(opts.rules ?? [])];
  const counts = new Map<string, number>();
  const shapes = lines.map((l) => shapeOf(l.text));
  for (const s of shapes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const enoughForOutliers = lines.length >= 10;

  const best = new Map<string, Candidate>();
  lines.forEach((l, i) => {
    const shape = shapes[i];
    const count = counts.get(shape)!;
    const rarity = maxCount > 1 ? 1 - Math.log(1 + count) / Math.log(1 + maxCount) : 0;
    const text = l.text.slice(0, LIMITS.maxLineChars);

    let hit: Rule | null = null;
    for (const r of rules) {
      if (r.pattern.test(text) && (!hit || WEIGHT[r.severity] > WEIGHT[hit.severity])) hit = r;
    }

    let cand: Candidate | null = null;
    if (hit) {
      cand = {
        lineNo: l.no, text, shape, severity: hit.severity, reason: "rule", rule: hit,
        score: Math.min(1, WEIGHT[hit.severity] + 0.05 * rarity), rarity,
      };
    } else if (enoughForOutliers && count <= Math.max(1, Math.floor(lines.length * 0.01)) && rarity > 0.5) {
      cand = {
        lineNo: l.no, text, shape, severity: rarity >= 0.8 ? "medium" : "low", reason: "outlier", rule: null,
        score: 0.5 * rarity, rarity,
      };
    }
    if (!cand) return;
    const prev = best.get(shape);
    if (!prev || cand.score > prev.score) best.set(shape, cand);
  });

  const ranked = [...best.values()]
    .sort((a, b) => b.score - a.score || a.lineNo - b.lineNo)
    .slice(0, LIMITS.topN);

  const findings: Finding[] = ranked.map((c, i) => {
    const occurrences = counts.get(c.shape)!;
    const detail =
      c.reason === "rule"
        ? `Matched rule: ${c.rule!.name}.${occurrences > 1 ? ` Shape repeats ${occurrences.toLocaleString("en-US")} times.` : ""}`
        : `This line shape appears ${occurrences === 1 ? "once" : `${occurrences} times`} in ${lines.length.toLocaleString("en-US")} lines.`;
    return {
      rank: i + 1, lineNo: c.lineNo, text: redact(c.text), severity: c.severity, reason: c.reason,
      ruleId: c.rule?.id ?? null, score: Math.round(c.score * 10_000) / 10_000, detail, occurrences,
    };
  });

  return { lineCount: lines.length, byteCount, findings, durationMs: Math.max(0, now() - t0) };
}
