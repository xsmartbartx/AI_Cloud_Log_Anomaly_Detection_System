import { BUILTIN_RULES } from "@anomaly/detector";
import { EmptyState } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SeverityChip } from "@/components/ui/severity";
import { RuleForm } from "@/components/app/rule-form";
import { store } from "@/lib/store";
import { requireCtx } from "@/lib/auth";
import { can } from "@/lib/authz";
import { deleteRuleAction, toggleRuleAction } from "@/lib/actions";

export const metadata = { title: "Rules · Linegist" };

export default async function Rules() {
  const [{ member }, custom] = await Promise.all([requireCtx(), store().then((s) => s.listRules())]);
  const manage = can(member.role, "rules:write");
  const flagRules = custom.filter((r) => r.kind === "flag");
  const ignoreRules = custom.filter((r) => r.kind === "ignore");
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl">Rules</h1>
        <p className="mt-1 text-sm text-muted">Rules flag lines by pattern. Patterns are case-insensitive and limited to 200 characters.</p>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg">Your rules</h2>
        {manage ? <RuleForm /> : <p className="text-sm text-muted">Only owners and admins can add or change rules.</p>}
        {flagRules.length === 0 ? (
          <EmptyState title="No custom rules" body="Add a rule for something specific to your systems, like a service name plus an error code." />
        ) : (
          <Table>
            <thead><tr><Th>Name</Th><Th>Pattern</Th><Th>Severity</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
            <tbody>
              {flagRules.map((r) => (
                <tr key={r.id}>
                  <Td>{r.name}</Td><Td><code className="font-mono text-xs">{r.pattern}</code></Td>
                  <Td><SeverityChip level={r.severity} /></Td><Td>{r.enabled ? "On" : "Off"}</Td>
                  <Td>
                    {manage && <div className="flex gap-2">
                      <form action={toggleRuleAction}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="secondary" type="submit">{r.enabled ? "Turn off" : "Turn on"}</Button></form>
                      <form action={deleteRuleAction}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="ghost" type="submit">Delete</Button></form>
                    </div>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">Ignored lines</h2>
        <p className="text-sm text-muted">Lines matching these patterns are left out of results. Add one from a finding with "Ignore lines like this". Only the pattern is stored.</p>
        {ignoreRules.length === 0 ? (
          <EmptyState title="Nothing ignored" body="When a result keeps showing a line you do not care about, ignore it from the result and it will appear here." />
        ) : (
          <Table>
            <thead><tr><Th>Pattern</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
            <tbody>
              {ignoreRules.map((r) => (
                <tr key={r.id}>
                  <Td><code className="break-all font-mono text-xs">{r.pattern}</code></Td>
                  <Td>{r.enabled ? "On" : "Off"}</Td>
                  <Td>
                    {manage && <div className="flex gap-2">
                      <form action={toggleRuleAction}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="secondary" type="submit">{r.enabled ? "Turn off" : "Turn on"}</Button></form>
                      <form action={deleteRuleAction}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="ghost" type="submit">Delete</Button></form>
                    </div>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">Built-in rules</h2>
        <Table>
          <thead><tr><Th>Name</Th><Th>Severity</Th></tr></thead>
          <tbody>
            {BUILTIN_RULES.map((r) => <tr key={r.id}><Td>{r.name}</Td><Td><SeverityChip level={r.severity} /></Td></tr>)}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
