"use client";
import { useState } from "react";
import type { Finding } from "@anomaly/detector";
import { Button } from "@/components/ui/button";
import { download, toCsv, toJson, type ExportMeta } from "@/lib/export";

export function ResultActions({ meta, findings }: { meta: ExportMeta; findings: Finding[] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(toJson(meta, findings));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the download buttons still work */ }
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export results">
      <Button size="sm" variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy JSON"}</Button>
      <Button size="sm" variant="secondary" onClick={() => download(`scan-${meta.scanId}.json`, toJson(meta, findings), "application/json")}>Download JSON</Button>
      <Button size="sm" variant="secondary" onClick={() => download(`scan-${meta.scanId}.csv`, toCsv(findings), "text/csv")}>Download CSV</Button>
    </div>
  );
}
