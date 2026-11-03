export const metadata = { title: "Docs · Linegist" };

const curl = `curl -X POST https://linegist.onenexora.com/api/v1/scans \\
  -H "Authorization: Bearer $LINEGIST_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "2026-10-13T09:00:01Z ERROR db connection refused\\n..."}'`;

const response = `{
  "id": "a1f3c2d4",
  "format": "plain",
  "lineCount": 4812,
  "flaggedCount": 3,
  "findings": [
    { "rank": 1, "lineNo": 412, "severity": "critical", "reason": "rule",
      "text": "FATAL worker out of memory", "detail": "Matched rule: Out of memory." }
  ]
}`;

const alertPayload = `{
  "event": "scan.completed",
  "scan_id": "a1f3c2d4-...",
  "flagged_count": 3,
  "highest_severity": "critical",
  "by_severity": { "critical": 1, "high": 1, "medium": 1, "low": 0 },
  "format": "json",
  "source": "api",
  "url": "https://linegist.onenexora.com/app/scans/a1f3c2d4-...",
  "timestamp": "2026-11-03T14:00:00.000Z"
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
        <h2 className="text-lg">4. Log formats</h2>
        <p className="text-sm">Linegist detects JSON lines, syslog and web access logs (nginx, Apache) from the first 100 lines and reads each in its own terms, so per-request values such as user ids, process ids and URL paths do not make routine lines look unusual. Anything else is treated as plain text. The detected format is shown with the results and returned as <code className="font-mono">format</code> by the API.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">5. Alerts</h2>
        <p className="text-sm">Settings, Alerts: add one HTTPS webhook and pick the lowest severity that should trigger it. Linegist sends a signed JSON message or a Slack message after a scan that reaches that severity. The message holds counts per severity, the log format and a link to the scan, never log text. A failing webhook never affects a scan; the last delivery result is shown in Settings.</p>
        <p className="text-sm">Signed JSON requests carry <code className="font-mono">x-linegist-timestamp</code> and <code className="font-mono">x-linegist-signature</code>, the hex HMAC-SHA256 of <code className="font-mono">timestamp.body</code> with your signing secret. Reject requests older than five minutes. Only HTTPS on port 443 and public addresses are allowed.</p>
        <Code>{alertPayload}</Code>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">6. New since last scan</h2>
        <p className="text-sm">Optional, off by default. When on, findings that were not flagged in your previous scan carry a New badge in the web app and <code className="font-mono">&quot;isNew&quot;: true</code> in the API. To compare, Linegist keeps only salted hashes of the latest scan&apos;s line shapes, never log text, and deletes them when you turn the option off. The first scan after turning it on marks nothing.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg">Privacy</h2>
        <p className="text-sm">Samples are analysed and discarded. Tokens, passwords and keys are masked in results. History keeps counts only unless you turn on retention in Settings. Alerts carry counts and a link only.</p>
      </section>
    </div>
  );
}
