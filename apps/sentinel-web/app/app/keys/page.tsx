import { EmptyState } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KeyForm } from "@/components/app/key-form";
import { ago } from "@/components/app/format";
import { store } from "@/lib/store";
import { revokeKeyAction } from "@/lib/actions";

export const metadata = { title: "API keys · Lineworth" };

export default async function Keys() {
  const keys = await (await store()).listKeys();
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl">API keys</h1>
        <p className="mt-1 text-sm text-muted">Use a key to scan from scripts and CI. See the <a className="text-accent underline" href="/docs">quickstart</a>.</p>
      </div>
      <KeyForm />
      {keys.length === 0 ? (
        <EmptyState title="No keys yet" body="Create a key to call the API. Keys are shown once, so store them somewhere safe." />
      ) : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Key</Th><Th>Created</Th><Th>Last used</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <Td>{k.name}</Td>
                <Td><span className="font-mono text-xs">{k.prefix}…</span></Td>
                <Td>{ago(k.createdAt)}</Td>
                <Td>{k.lastUsedAt ? ago(k.lastUsedAt) : "Never"}</Td>
                <Td>
                  {k.revokedAt ? <span className="text-muted">Revoked</span> : (
                    <form action={revokeKeyAction}><input type="hidden" name="id" value={k.id} /><Button size="sm" variant="secondary" type="submit">Revoke</Button></form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
