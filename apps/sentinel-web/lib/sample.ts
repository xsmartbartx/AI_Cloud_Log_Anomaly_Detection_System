const ok = (i: number) =>
  `2026-10-13T09:${String(Math.floor(i / 60) % 60).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}Z INFO api GET /v1/items 200 ${20 + (i % 17)}ms`;

export function sampleLog(): string {
  const lines = Array.from({ length: 140 }, (_, i) => ok(i));
  lines.splice(37, 0, "2026-10-13T09:00:37Z WARN api retrying upstream call (attempt 2)");
  lines.splice(71, 0, "2026-10-13T09:01:11Z ERROR db connection refused to 10.0.3.12:5432");
  lines.splice(90, 0, "2026-10-13T09:01:30Z INFO auth Authorization: Bearer abcdef1234567890abcdef rejected: invalid token");
  lines.splice(112, 0, "2026-10-13T09:01:52Z FATAL worker out of memory, killed process 8841");
  lines.splice(130, 0, "2026-10-13T09:02:10Z INFO scheduler unexpected handshake sequence in stream 0x7f3a");
  return lines.join("\n");
}
