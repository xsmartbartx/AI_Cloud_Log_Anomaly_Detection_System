import Link from "next/link";
import { Card, EmptyState, QuotaMeter, StatTile } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { ago, n } from "@/components/app/format";
import { store } from "@/lib/store";

export const metadata = { title: "Overview · Linegist" };

export default async function Overview() {
  const s = await store();
  const [usage, scans, totals] = await Promise.all([s.usage(), s.listScans(5), s.totals()]);
  const flagged = totals.flagged;
  const lines = totals.lines;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Overview</h1>
        <Link href="/app/scan" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">New scan</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Scans this month" value={n(usage.used)} note={`of ${n(usage.limit)}`} />
        <StatTile label="Lines scanned" value={n(lines)} />
        <StatTile label="Lines flagged" value={n(flagged)} />
      </div>
      <Card className="p-4">
        <QuotaMeter used={usage.used} limit={usage.limit} />
        <p className="mt-3 text-xs text-muted">{usage.plan.name} plan. <Link className="text-accent underline" href="/app/usage">Manage plan</Link></p>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg">Recent scans</h2>
        {scans.length === 0 ? (
          <EmptyState title="No scans yet" body="Paste a log sample to see the lines worth reading." action={<Link href="/app/scan" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">New scan</Link>} />
        ) : (
          <Table>
            <thead><tr><Th>Scan</Th><Th>Source</Th><Th>Lines</Th><Th>Flagged</Th><Th>When</Th></tr></thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <Td><Link className="font-mono text-accent underline" href={`/app/scans/${s.id}`}>{s.id}</Link></Td>
                  <Td>{s.source}</Td><Td>{n(s.lineCount)}</Td><Td>{s.flaggedCount}</Td><Td>{ago(s.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
