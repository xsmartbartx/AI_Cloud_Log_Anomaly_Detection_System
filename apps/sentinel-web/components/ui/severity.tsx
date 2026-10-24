import { cn } from "@/lib/cn";

export type Severity = "critical" | "high" | "medium" | "low";

const styles: Record<Severity, string> = {
  critical: "bg-sev-critical-bg text-sev-critical",
  high: "bg-sev-high-bg text-sev-high",
  medium: "bg-sev-medium-bg text-sev-medium",
  low: "bg-sev-low-bg text-sev-low",
};

/** Text label is always present, colour is never the only signal. */
export function SeverityChip({ level }: { level: Severity }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs uppercase tracking-wide", styles[level])}>
      {level}
    </span>
  );
}
