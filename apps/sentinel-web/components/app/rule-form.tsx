"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addRuleAction, type RuleState } from "@/lib/actions";

export function RuleForm() {
  const [state, action, pending] = useActionState(addRuleAction, { status: "idle" } as RuleState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="w-48"><Input name="name" label="Name" placeholder="Payment gateway down" /></div>
      <div className="w-64"><Input name="pattern" label="Pattern (regex)" placeholder="gateway.*(503|timeout)" error={state.status === "error" ? state.message : undefined} /></div>
      <div className="space-y-1">
        <label htmlFor="sev" className="text-sm font-medium">Severity</label>
        <select id="sev" name="severity" defaultValue="medium" className="h-10 rounded-md border border-border-input bg-bg px-3 text-sm">
          <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>
      <Button type="submit" loading={pending}>Add rule</Button>
    </form>
  );
}
