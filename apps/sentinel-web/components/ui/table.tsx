import { cn } from "@/lib/cn";

export function Table({ className, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className={cn("w-full text-left text-sm", className)} {...rest} />
    </div>
  );
}
export const Th = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" className="border-b border-border bg-surface px-4 py-2 text-xs uppercase tracking-wide text-muted" {...p} />
);
export const Td = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className="border-b border-border px-4 py-3 last:border-b-0" {...p} />
);
