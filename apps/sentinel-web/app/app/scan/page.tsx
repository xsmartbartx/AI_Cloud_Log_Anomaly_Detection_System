import { ScanForm } from "@/components/app/scan-form";
import { store } from "@/lib/store";
import { requireCtx } from "@/lib/auth";
import { can } from "@/lib/authz";
import { sampleLog } from "@/lib/sample";

export const metadata = { title: "New scan · Linegist" };

export default async function NewScan() {
  const [{ member }, u] = await Promise.all([requireCtx(), store().then((s) => s.usage())]);
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl">New scan</h1>
        <p className="mt-1 text-sm text-muted">{(u.limit - u.used).toLocaleString("en-US")} scans left this month.</p>
      </div>
      <ScanForm sample={sampleLog()} exhausted={u.used >= u.limit} canIgnore={can(member.role, "rules:write")} />
    </div>
  );
}
