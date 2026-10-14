import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/card";
import { FindingRow } from "@/components/ui/finding";
import { n } from "@/components/app/format";
import { store } from "@/lib/store";

export default async function ScanDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await (await store()).getScan(id);
  if (!scan) notFound();
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl">Scan <span className="font-mono">{scan.id}</span></h1>
        <p className="mt-1 text-sm text-muted">{n(scan.lineCount)} lines · {scan.flaggedCount} flagged · {scan.durationMs} ms · via {scan.source}</p>
      </div>
      {scan.findings === null ? (
        <EmptyState
          title="Findings were not kept"
          body="Lineworth does not store log text by default, so only counts are saved. Turn on retention to keep findings for new scans."
          action={<Link className="text-sm text-accent underline" href="/app/settings">Open Settings</Link>}
        />
      ) : scan.findings.length === 0 ? (
        <EmptyState title="Nothing stood out" body="No rule matched and no line looked unusual in this sample." />
      ) : (
        <Card><ul>{scan.findings.map((f) => <FindingRow key={f.rank} f={f} />)}</ul></Card>
      )}
    </div>
  );
}
