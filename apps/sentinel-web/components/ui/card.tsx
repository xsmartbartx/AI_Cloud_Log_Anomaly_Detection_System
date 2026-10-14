import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-bg shadow-card", className)} {...rest} />;
}

export function StatTile({ label, value, note, loading }: { label: string; value?: string; note?: string; loading?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded-sm bg-canvas" aria-label="Loading" />
      ) : (
        <p className="mt-1 text-xl tabular-nums">{value ?? "—"}</p>
      )}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Card>
  );
}

export function QuotaMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent";
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>Scans this month</span>
        <span className="tabular-nums text-muted">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-label="Scan quota"
        className="mt-2 h-2 overflow-hidden rounded-pill bg-canvas"
        style={{ borderRadius: 999 }}
      >
        <div className={cn("h-full transition-[width] duration-200 ease-out", tone)} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 100 && <p className="mt-2 text-xs text-danger">Quota reached. Upgrade to keep scanning.</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-lg">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
