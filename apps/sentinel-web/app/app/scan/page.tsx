import { ScanForm } from "@/components/app/scan-form";
import { store } from "@/lib/store";
import { sampleLog } from "@/lib/sample";

export const metadata = { title: "New scan · Linegist" };

export default async function NewScan() {
  const u = await (await store()).usage();
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl">New scan</h1>
        <p className="mt-1 text-sm text-muted">{(u.limit - u.used).toLocaleString("en-US")} scans left this month.</p>
      </div>
      <ScanForm sample={sampleLog()} exhausted={u.used >= u.limit} />
    </div>
  );
}
