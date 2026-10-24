"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { SeverityChip, type Severity } from "./severity";
import { IgnoreControl } from "./ignore-control";

export type FindingData = {
  rank: number;
  lineNo: number;
  text: string;
  severity: Severity;
  reason: "rule" | "outlier";
  detail: string;
};

export function FindingRow({ f, canIgnore = false }: { f: FindingData; canIgnore?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
      >
        <ChevronRight className={cn("mt-0.5 size-4 shrink-0 text-muted transition-transform duration-150", open && "rotate-90")} aria-hidden />
        <span className="w-6 shrink-0 text-xs tabular-nums text-muted">{f.rank}</span>
        <SeverityChip level={f.severity} />
        <span className={cn("min-w-0 flex-1 font-mono text-xs leading-5", open ? "whitespace-pre-wrap break-all" : "truncate")}>
          {f.text}
        </span>
      </button>
      {open && (
        <div className="space-y-1 px-4 pb-3 pl-[4.25rem] text-sm text-muted">
          <p>Line {f.lineNo} · {f.reason === "rule" ? "Matched a rule" : "Unusual shape"}</p>
          <p>{f.detail}</p>
          {canIgnore && <div className="pt-2 text-text"><IgnoreControl text={f.text} /></div>}
        </div>
      )}
    </li>
  );
}
