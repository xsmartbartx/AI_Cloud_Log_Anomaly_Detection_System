import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Th, Td } from "@/components/ui/table";
import { store } from "@/lib/store";
import { requireCtx } from "@/lib/auth";
import { retentionAction } from "@/lib/actions";

export const metadata = { title: "Settings · Lineworth" };

export default async function Settings() {
  const [{ org }, members] = await Promise.all([requireCtx(), store().then((s) => s.listMembers())]);
  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl">Settings</h1>
      <Card className="p-5">
        <h2 className="text-lg">Organization</h2>
        <p className="mt-1 text-sm text-muted">{org.name}</p>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg">Keep findings</h2>
        <p className="mt-1 text-sm text-muted">Off by default. When on, flagged lines (with secrets masked) are saved so you can reopen them from History. Full samples are never kept.</p>
        <form action={retentionAction} className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="retain" defaultChecked={org.retainSamples} className="size-4 accent-[var(--c-accent)]" /> Keep findings for new scans
          </label>
          <Button size="sm" type="submit">Save</Button>
        </form>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg">Members</h2>
        <Table>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th></tr></thead>
          <tbody>{members.map((m) => <tr key={m.id}><Td>{m.name}</Td><Td>{m.email}</Td><Td className="capitalize">{m.role}</Td></tr>)}</tbody>
        </Table>
        <p className="text-xs text-muted">Invites and roles are managed through your NEXORA organization.</p>
      </section>
    </div>
  );
}
