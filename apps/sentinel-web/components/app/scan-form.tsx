"use client";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LogArea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { FindingRow } from "@/components/ui/finding";
import { EmptyState } from "@/components/ui/card";
import { runScanAction, type ScanState } from "@/lib/actions";
import Link from "next/link";

const idle: ScanState = { status: "idle" };

export function ScanForm({ sample, exhausted }: { sample: string; exhausted: boolean }) {
  const [state, action, pending] = useActionState(runScanAction, idle);
  const area = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <LogArea
          ref={area}
          name="sample"
          label="Log sample"
          placeholder="Paste one log entry per line"
          hint="Up to 50,000 lines or 5 MB. Nothing is stored unless retention is on."
          error={state.status === "error" ? state.message : undefined}
          disabled={exhausted}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending} disabled={exhausted}>{pending ? "Scanning" : "Run scan"}</Button>
          <Button type="button" variant="secondary" disabled={exhausted} onClick={() => { if (area.current) area.current.value = sample; }}>Use example</Button>
          <label className="text-sm text-muted">
            or upload{" "}
            <input type="file" name="file" accept=".log,.txt,text/plain" className="text-xs file:mr-2 file:rounded-md file:border file:border-border-input file:bg-bg file:px-2 file:py-1 file:text-xs" />
          </label>
        </div>
        {exhausted && <Alert tone="error">You have used all scans in your plan this month. <Link className="underline" href="/app/usage">Upgrade</Link> to keep scanning.</Alert>}
      </form>

      {state.status === "done" && (
        <section aria-live="polite" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg">Results</h2>
            <p className="text-xs text-muted">{state.lineCount.toLocaleString("en-US")} lines · {state.flaggedCount} flagged · scan {state.scanId}</p>
          </div>
          {state.findings.length === 0 ? (
            <EmptyState title="Nothing stood out" body="No rule matched and no line looked unusual in this sample. That is a good sign, though a short sample can hide problems." />
          ) : (
            <Card><ul>{state.findings.map((f) => <FindingRow key={f.rank} f={f} />)}</ul></Card>
          )}
          <Alert>Findings are shown once. Turn on retention in Settings to keep them in History.</Alert>
        </section>
      )}
    </div>
  );
}
