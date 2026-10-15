"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, LogArea } from "@/components/ui/field";
import { SeverityChip } from "@/components/ui/severity";
import { Card, StatTile, QuotaMeter, EmptyState } from "@/components/ui/card";
import { FindingRow, type FindingData } from "@/components/ui/finding";
import { Table, Th, Td } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";

const findings: FindingData[] = [
  { rank: 1, lineNo: 412, text: "FATAL: out of memory, killed process 8841 (worker)", severity: "critical", reason: "rule", detail: "Matched built-in rule: out of memory." },
  { rank: 2, lineNo: 97, text: "connection refused to 10.0.3.12:5432 after 3 retries", severity: "high", reason: "rule", detail: "Matched built-in rule: connection refused." },
  { rank: 3, lineNo: 1230, text: "unexpected token handshake in stream 0x7f3a (seen once)", severity: "medium", reason: "outlier", detail: "This line shape appears once in 4,812 lines." },
];

export default function DesignPage() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };
  return (
    <main className="mx-auto max-w-content space-y-12 px-4 py-12 sm:px-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Design system</p>
          <h1 className="text-2xl">Lineworth primitives</h1>
        </div>
        <Button variant="secondary" onClick={toggle}>Theme: {theme}</Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Run scan</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Revoke key</Button>
          <Button loading>Scanning</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg">Fields</h2>
          <Input label="Key name" placeholder="ci-pipeline" hint="Shown only to your team." />
          <Input label="Pattern" defaultValue="(" error="Invalid pattern." />
          <LogArea label="Log sample" placeholder="Paste one log entry per line" hint="Up to 50,000 lines or 4 MB." />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg">Severity and alerts</h2>
          <div className="flex gap-2">
            <SeverityChip level="critical" /><SeverityChip level="high" /><SeverityChip level="medium" /><SeverityChip level="low" />
          </div>
          <Alert>Nothing is stored. Each scan uses only the sample you paste.</Alert>
          <Alert tone="error">Sample is too large. Limit is 4 MB.</Alert>
          <Alert tone="success">Scan complete: 3 lines flagged.</Alert>
          <Button variant="secondary" onClick={() => setOpen(true)}>Open modal</Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Create API key">
            <p>The key is shown once. Store it somewhere safe.</p>
          </Modal>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Dashboard parts</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Scans this month" value="128" note="of 150" />
          <StatTile label="Lines flagged" value="1,204" />
          <StatTile label="Loading" loading />
        </div>
        <Card className="p-4 space-y-4">
          <QuotaMeter used={128} limit={150} />
          <QuotaMeter used={150} limit={150} />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Findings</h2>
        <Card><ul>{findings.map((f) => <FindingRow key={f.rank} f={f} />)}</ul></Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Table and empty state</h2>
        <Table>
          <thead><tr><Th>Scan</Th><Th>Lines</Th><Th>Flagged</Th><Th>When</Th></tr></thead>
          <tbody>
            <tr><Td>a1f3c2</Td><Td>4,812</Td><Td>3</Td><Td>2 min ago</Td></tr>
            <tr><Td>9be0d4</Td><Td>1,090</Td><Td>10</Td><Td>1 h ago</Td></tr>
          </tbody>
        </Table>
        <EmptyState title="No scans yet" body="Paste a log sample to see the lines worth reading." action={<Button>New scan</Button>} />
      </section>
    </main>
  );
}
