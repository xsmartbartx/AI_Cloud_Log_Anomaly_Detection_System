export const metadata = { title: "Docs · Linegist" };

const curl = `curl -X POST https://linegist.onenexora.com/api/v1/scans \\
  -H "Authorization: Bearer $SENTINEL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "2026-10-13T09:00:01Z ERROR db connection refused\\n..."}'`;

const response = `{
  "id": "a1f3c2d4",
  "lineCount": 4812,
  "flaggedCount": 3,
  "findings": [
    { "rank": 1, "lineNo": 412, "severity": "critical", "reason": "rule",
      "text": "FATAL worker out of memory", "detail": "Matched rule: Out of memory." }
  ]
}`;

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-5"><code>{children}</code></pre>;
}

export default function Docs() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-2xl">Quickstart</h1>
        <p className="mt-2 text-muted">Scan a log sample from the web app or the API.</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg">1. Web</h2>
        <p className="text-sm">Open Linegist, choose New scan, paste your sample or upload a text file, and run it. Limits: 50,000 lines or 4 MB per sample.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">2. API</h2>
        <p className="text-sm">Create a key under API keys in the dashboard. The key is shown once. Send the sample as JSON.</p>
        <Code>{curl}</Code>
        <Code>{response}</Code>
        <p className="text-sm text-muted">Errors: 401 invalid key, 400 empty sample, 402 monthly quota reached, 413 sample too large.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">3. How lines are chosen</h2>
        <p className="text-sm">Each line is matched against built-in and custom rules. Separately, lines are reduced to a shape (numbers, IDs and addresses masked) and shapes that rarely repeat score as outliers. The top ten by score are returned. The same input always gives the same result.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">Privacy</h2>
        <p className="text-sm">Samples are analysed and discarded. Tokens, passwords and keys are masked in results. History keeps counts only unless you turn on retention in Settings.</p>
      </section>
    </div>
  );
}
