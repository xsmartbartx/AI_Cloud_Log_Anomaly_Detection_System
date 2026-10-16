import Link from "next/link";
import { EmptyState } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { ago, n } from "@/components/app/format";
import { store } from "@/lib/store";

export const metadata = { title: "History · Lineworth" };

export default async function History() {
  const scans = await (await store()).listScans();
  return (
    <div className="space-y-4">
      <h1 className="text-xl">History</h1>
      {scans.length === 0 ? (
        <EmptyState title="No scans yet" body="Completed scans appear here with counts. Log text is not kept unless retention is on." />
      ) : (
        <Table>
          <thead><tr><Th>Scan</Th><Th>Source</Th><Th>Lines</Th><Th>Size</Th><Th>Flagged</Th><Th>When</Th></tr></thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.id}>
                <Td><Link className="font-mono text-accent underline" href={`/app/scans/${s.id}`}>{s.id}</Link></Td>
                <Td>{s.source}</Td><Td>{n(s.lineCount)}</Td><Td>{(s.byteCount / 1024).toFixed(1)} KB</Td><Td>{s.flaggedCount}</Td><Td>{ago(s.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
