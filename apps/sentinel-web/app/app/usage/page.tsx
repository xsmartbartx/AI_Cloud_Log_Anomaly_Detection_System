import { Card, QuotaMeter } from "@/components/ui/card";
import { PricingTable } from "@/components/marketing/pricing-table";
import { store } from "@/lib/store";
import { PortalButton } from "@/components/app/portal-button";

export const metadata = { title: "Usage and plan · Linegist" };

export default async function Usage() {
  const u = await (await store()).usage();
  return (
    <div className="space-y-6">
      <h1 className="text-xl">Usage and plan</h1>
      <Card className="max-w-xl p-4">
        <QuotaMeter used={u.used} limit={u.limit} />
        <p className="mt-3 text-xs text-muted">{u.plan.name} plan · period {u.period} (UTC). Resets on the first of the month.</p>
      </Card>
      <section>
        <h2 className="text-lg">Change plan</h2>
        <p className="mt-1 text-sm text-muted">Checkout and plan changes are handled by Stripe. Cancel any time from the billing portal.</p>
        <PricingTable currentPlan={u.plan.id} checkout />
        <PortalButton />
      </section>
    </div>
  );
}
