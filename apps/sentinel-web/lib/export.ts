import type { Finding } from "@anomaly/detector";

export type ExportMeta = { scanId: string; lineCount: number; flaggedCount: number };

const q = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection from log text
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv(findings: Finding[]): string {
  const head = ["rank", "line", "severity", "reason", "score", "text", "detail"];
  const rows = findings.map((f) => [f.rank, f.lineNo, f.severity, f.reason, f.score, f.text, f.detail].map(q).join(","));
  return [head.join(","), ...rows].join("\r\n") + "\r\n";
}

export function toJson(meta: ExportMeta, findings: Finding[]): string {
  return JSON.stringify({ ...meta, findings }, null, 2);
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
