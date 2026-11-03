"use client";
import { useActionState, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { saveAlertAction, removeAlertAction, testAlertAction, type AlertState } from "@/lib/actions";

type Props = { url: string; kind: "json" | "slack"; minSeverity: string; enabled: boolean; saved: boolean; manage: boolean };

export function AlertForm({ url, kind, minSeverity, enabled, saved, manage }: Props) {
  const [state, action, pending] = useActionState(saveAlertAction, { status: "idle" } as AlertState);
  const [test, setTest] = useState<AlertState>({ status: "idle" });
  const [testing, startTest] = useTransition();
  const [removing, startRemove] = useTransition();
  return (
    <div className="mt-4 space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="w-80"><Input name="url" label="Webhook URL (https)" defaultValue={url} disabled={!manage} placeholder="https://hooks.slack.com/services/..." error={state.status === "error" ? state.message : undefined} /></div>
        <div className="space-y-1">
          <label htmlFor="kind" className="text-sm font-medium">Format</label>
          <select id="kind" name="kind" defaultValue={kind} disabled={!manage} className="h-10 rounded-md border border-border-input bg-bg px-3 text-sm">
            <option value="json">Signed JSON</option><option value="slack">Slack message</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="minSeverity" className="text-sm font-medium">Alert from</label>
          <select id="minSeverity" name="minSeverity" defaultValue={minSeverity} disabled={!manage} className="h-10 rounded-md border border-border-input bg-bg px-3 text-sm">
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={saved ? enabled : true} disabled={!manage} className="size-4 accent-[var(--c-accent)]" /> On
        </label>
        <Button type="submit" loading={pending} disabled={!manage}>Set webhook</Button>
      </form>
      {state.status === "ok" && <Alert tone="success">{state.message}</Alert>}
      {saved && manage && (
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" loading={testing} onClick={() => startTest(async () => setTest(await testAlertAction()))}>Send test alert</Button>
          <Button size="sm" variant="secondary" loading={removing} onClick={() => startRemove(async () => { await removeAlertAction(); })}>Remove</Button>
        </div>
      )}
      {test.status !== "idle" && <Alert tone={test.status === "ok" ? "success" : "error"}>{test.message}</Alert>}
    </div>
  );
}
