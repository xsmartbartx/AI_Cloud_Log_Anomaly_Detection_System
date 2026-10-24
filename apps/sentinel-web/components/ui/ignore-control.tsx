"use client";
import { useId, useState } from "react";
import { Button } from "./button";
import { suggestPattern } from "@/lib/pattern";
import { ignoreLinesAction } from "@/lib/actions";

/** Lets an admin mute lines like this one. The pattern is shown and editable before anything is saved. */
export function IgnoreControl({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState(() => suggestPattern(text));
  const [state, setState] = useState<{ kind: "idle" | "saving" | "done" | "error"; message?: string }>({ kind: "idle" });

  if (state.kind === "done") {
    return <p role="status" className="text-sm text-success">Added. New scans skip lines matching this pattern. Manage it under Rules.</p>;
  }
  if (!open) {
    return <Button size="sm" variant="secondary" type="button" onClick={() => setOpen(true)}>Ignore lines like this</Button>;
  }
  async function save() {
    setState({ kind: "saving" });
    const res = await ignoreLinesAction(pattern);
    setState(res.ok ? { kind: "done" } : { kind: "error", message: res.message });
  }
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">Pattern to ignore</label>
      <input
        id={id}
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        spellCheck={false}
        maxLength={200}
        aria-describedby={`${id}-hint`}
        className="h-10 w-full rounded-md border border-border-input bg-bg px-3 font-mono text-xs"
      />
      <p id={`${id}-hint`} className="text-xs text-muted">
        Numbers, IDs and masked secrets are wildcards. Lines matching this pattern are left out of future results for everyone in your organization. Only the pattern is saved, not the log.
      </p>
      {state.kind === "error" && <p role="alert" className="text-xs text-danger">{state.message}</p>}
      <div className="flex gap-2">
        <Button size="sm" type="button" loading={state.kind === "saving"} onClick={save}>Add ignore rule</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
