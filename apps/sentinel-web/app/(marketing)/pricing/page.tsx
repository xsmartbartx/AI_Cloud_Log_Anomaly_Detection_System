import { PricingTable } from "@/components/marketing/pricing-table";

export const metadata = { title: "Pricing · Linegist" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
      <h1 className="text-2xl">Pricing</h1>
      <p className="mt-2 text-muted">Plans are measured in scans per month. A scan is one pasted sample or one API call. If you reach your limit, scans pause. You are never billed for going over.</p>
      <PricingTable />
      <section className="mt-16 max-w-2xl space-y-4">
        <h2 className="text-lg">Common questions</h2>
        <div>
          <h3 className="text-sm font-semibold">What happens at the limit?</h3>
          <p className="text-sm text-muted">Scans pause until the next month or until you upgrade. We never bill for going over, and you can cancel from the billing page at any time.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Do you keep my logs?</h3>
          <p className="text-sm text-muted">No. Each scan uses only the sample you send. You can opt in to keep findings for history.</p>
        </div>
      </section>
    </div>
  );
}
