import { cn } from "@/lib/cn";

const tones = { info: "border-border bg-surface", error: "border-danger text-danger", success: "border-success text-success" };

export function Alert({ tone = "info", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}
