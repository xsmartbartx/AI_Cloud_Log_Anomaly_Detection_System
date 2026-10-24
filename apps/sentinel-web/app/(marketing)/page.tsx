import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SeverityChip } from "@/components/ui/severity";
import { PLANS } from "@/lib/plans";

const demo = [
  { s: "critical" as const, t: "FATAL worker out of memory, killed process 8841", r: "Matched rule: out of memory" },
  { s: "high" as const, t: "ERROR db connection refused to 10.0.3.12:5432", r: "Matched rule: connection failure" },
  { s: "medium" as const, t: "INFO scheduler unexpected handshake sequence in stream 0x7f3a", r: "Appears once in 142 lines" },
];

const steps = [
  ["01", "Paste", "Drop in a log sample, up to 50,000 lines. One entry per line."],
  ["02", "Analyze", "Rules catch the known bad. Frequency analysis catches the lines that look unlike the rest."],
  ["03", "Review", "Get the ten lines worth reading, ranked, each with the reason it was picked."],
];

const problems = [
  ["Reading one log should not need a pipeline", "Most log tools are built to ingest everything, all the time, and bill by the gigabyte. If you only need to understand one failed deploy or one noisy hour, that is a lot of machinery and a bill that grows with your logging."],
  ["A flagged line without a reason is noise", "Tools that raise alarms but cannot say why leave you checking every one by hand. You end up trusting none of them."],
];

const features = [
  ["Paid by the scan", "A flat price per month and a fixed number of scans. When you reach the number, scans pause. There is no overage bill."],
  ["Every line comes with a reason", "Each result says whether a rule matched or the line looked unlike the rest of the sample, and shows the line number. The same sample always gives the same result."],
  ["Nothing kept by default", "Samples are analyzed and discarded. Tokens, passwords and keys are masked in results. Turn on retention only if you want history."],
  ["Your own rules", "Add patterns for the things specific to your systems, like a service name plus an error code. They run next to the built-in rules."],
  ["From your terminal or CI", "Create an API key and post a sample. The response is the same ten lines."],
];

const faq = [
  ["Is this a log platform?", "No. Linegist does not collect logs or run dashboards. You bring a sample, it tells you where to look. Use it next to your existing tools, not instead of them."],
  ["What happens at my limit?", "Scans pause until next month or until you upgrade. We never bill for going over."],
  ["Do you keep my logs?", "Not by default. Each scan uses only the sample you send. If you turn on retention, only the flagged lines are kept, with secrets masked, for 30 days."],
  ["How big can a sample be?", "Up to 50,000 lines or 4 MB per scan."],
  ["Is the result the same every time?", "Yes. The analysis is deterministic. The same sample gives the same ten lines."],
];

export default function Landing() {
  return (
    <>
      <section className="mx-auto max-w-content px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <p className="text-sm font-medium text-accent">Linegist · Beta</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-[44px] font-bold leading-[1.05] tracking-tight sm:text-display">
          The ten lines worth reading.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg font-normal text-muted">
          Paste a log sample and get the lines that matter, with the reason for each. Flat price per scan. A hard cap instead of an overage bill. Nothing stored by default.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/go" className="inline-flex h-12 items-center rounded-md bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">Open Linegist</Link>
          <Link href="/docs" className="inline-flex h-12 items-center rounded-md border border-border-input px-6 font-semibold hover:bg-canvas">Read the docs</Link>
        </div>

        <Card className="mx-auto mt-14 max-w-3xl overflow-hidden text-left">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 text-xs text-muted">
            <span>Scan result · 142 lines · 3 flagged</span>
            <span>Example</span>
          </div>
          <ul>
            {demo.map((d, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="w-4 pt-0.5 text-xs text-muted">{i + 1}</span>
                <SeverityChip level={d.s} />
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs leading-5">{d.t}</p>
                  <p className="text-xs text-muted">{d.r}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <h2 className="text-xl">Why this exists</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          {problems.map(([h, b]) => (
            <div key={h}>
              <h3 className="text-lg">{h}</h3>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
          <h2 className="text-xl">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map(([n, h, b]) => (
              <div key={n}>
                <p className="text-sm tabular-nums text-accent">{n}</p>
                <h3 className="mt-1 text-lg">{h}</h3>
                <p className="mt-2 text-sm text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <h2 className="text-xl">What you get</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {features.map(([h, b]) => (
            <div key={h}>
              <h3 className="text-lg">{h}</h3>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold">Coming next</h3>
          <p className="mt-1 text-sm text-muted">Muting lines you do not care about, masking secrets in your browser before anything is sent, and a view of what is new since your last scan. Deeper AI analysis and live connections to cloud logs are further out. None of these are available yet.</p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
          <h2 className="text-xl">Pricing</h2>
          <p className="mt-2 text-sm text-muted">Monthly price and scans per month. Yearly saves 20%. No overage charges.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-bg p-5">
                <h3 className="text-lg">{p.name}</h3>
                <p className="mt-3 text-xl tabular-nums">${p.monthly}<span className="text-sm font-normal text-muted"> /mo</span></p>
                <p className="mt-1 text-sm text-muted">{p.scans.toLocaleString("en-US")} scans</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm"><Link className="text-accent underline" href="/pricing">Full pricing and what each plan includes</Link></p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-xl">Questions</h2>
        <dl className="mt-8 space-y-6">
          {faq.map(([q, a]) => (
            <div key={q}>
              <dt className="text-sm font-semibold">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-16 text-center sm:px-6">
          <h2 className="text-xl">Try it on a real log</h2>
          <p className="mt-2 text-sm text-muted">The free plan includes 20 scans a month.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/go" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">Open Linegist</Link>
            <Link href="/docs" className="inline-flex h-10 items-center rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-canvas">Read the docs</Link>
          </div>
        </div>
      </section>
    </>
  );
}
