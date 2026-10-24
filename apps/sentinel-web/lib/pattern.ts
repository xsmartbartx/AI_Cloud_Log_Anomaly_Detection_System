/** Browser-safe: no native modules here, the ignore control imports this file. */

/** Tokens that change from line to line and should become wildcards in a suggested pattern. */
const VARIABLE = new RegExp(
  [
    String.raw`\[redacted(?:-[a-z-]+)?\]`, // masked secrets: the raw line has real text here
    String.raw`\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?`,
    String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`,
    String.raw`\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b`,
    String.raw`0x[0-9a-f]+`,
    String.raw`\d+(?:\.\d+)?`,
  ].map((p) => `(${p})`).join("|"),
  "gi",
);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MAX_PATTERN = 200;

function build(line: string): string {
  let out = "";
  let last = 0;
  for (const m of line.matchAll(VARIABLE)) {
    const idx = m.index ?? 0;
    out += literal(line.slice(last, idx));
    out += /^\d+(\.\d+)?$/.test(m[0]) ? String.raw`\d+(?:\.\d+)?` : String.raw`\S+`;
    last = idx + m[0].length;
  }
  return out + literal(line.slice(last));
}
const literal = (s: string) => escapeRe(s).replace(/\s+/g, String.raw`\s+`);

/** A starting point for an ignore rule from a reported line: words stay literal, numbers, ids and secrets become wildcards. */
export function suggestPattern(line: string): string {
  let take = Math.min(line.trim().length, 160);
  let p = build(line.trim().slice(0, take));
  while (p.length > MAX_PATTERN && take > 8) {
    take = Math.floor(take * 0.8);
    p = build(line.trim().slice(0, take)); // a prefix is still a valid "contains" pattern
  }
  return p;
}
