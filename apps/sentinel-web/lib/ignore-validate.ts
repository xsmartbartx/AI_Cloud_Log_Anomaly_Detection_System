import RE2 from "re2";

const MAX_PATTERN = 200;

export type PatternCheck = { ok: true } | { ok: false; message: string };

/** An ignore rule hides lines, so it must be valid, specific and must not match everything. */
export function validateIgnorePattern(pattern: string): PatternCheck {
  if (pattern.length > MAX_PATTERN) return { ok: false, message: "Pattern is longer than 200 characters." };
  if (pattern.replace(/\\./g, "x").length < 4) return { ok: false, message: "Pattern is too short to be specific. Use at least 4 characters." };
  let re: RE2;
  try { re = new RE2(pattern, "i"); } catch { return { ok: false, message: "Pattern is not a valid regular expression." }; }
  if (re.test("") || re.test(" ") || re.test("a")) return { ok: false, message: "Pattern would match almost every line. Make it more specific." };
  return { ok: true };
}
