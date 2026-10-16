"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { createKeyAction, type KeyState } from "@/lib/actions";

export function KeyForm() {
  const [state, action, pending] = useActionState(createKeyAction, { status: "idle" } as KeyState);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="w-64"><Input name="name" label="Key name" placeholder="ci-pipeline" maxLength={60} error={state.status === "error" ? state.message : undefined} /></div>
        <Button type="submit" loading={pending}>Create key</Button>
      </form>
      {state.status === "created" && (
        <Alert tone="success">
          Key “{state.name}” created. Copy it now, it will not be shown again:
          <code className="mt-2 block break-all rounded-sm bg-canvas p-2 font-mono text-xs text-text">{state.secret}</code>
        </Alert>
      )}
    </div>
  );
}
