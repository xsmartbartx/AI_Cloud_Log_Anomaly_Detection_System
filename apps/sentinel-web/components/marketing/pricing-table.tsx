"use client";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, yearlyPrice } from "@/lib/plans";
import { cn } from "@/lib/cn";

export function PricingTable({ currentPlan, checkout }: { currentPlan?: string; checkout?: boolean }) {
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: string) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, interval: yearly ? "year" : "month" }) });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else setError(data.message ?? "Could not start checkout.");
    } catch {
      setError("Could not reach billing. Try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-8">
      <div role="group" aria-label="Billing interval" className="inline-flex rounded-md border border-border-input p-0.5 text-sm">
        {[false, true].map((y) => (
          <button
            key={String(y)}
            type="button"
            aria-pressed={yearly === y}
            onClick={() => setYearly(y)}
            className={cn("rounded-sm px-3 py-1.5 font-medium", yearly === y ? "bg-accent text-on-accent" : "text-muted hover:text-text")}
          >
            {y ? "Yearly, save 20%" : "Monthly"}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((p) => {
          const price = yearly ? yearlyPrice(p) / 12 : p.monthly;
          const current = currentPlan === p.id;
          return (
            <div key={p.id} className={cn("flex flex-col rounded-lg border bg-bg p-5", current ? "border-accent" : "border-border")}>
              <h3 className="text-lg">{p.name}</h3>
              <p className="mt-3 text-xl tabular-nums">${price % 1 === 0 ? price : price.toFixed(2)}<span className="text-sm font-normal text-muted"> /mo</span></p>
              <p className="mt-1 text-sm text-muted">{p.scans.toLocaleString("en-US")} scans a month</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.perks.map((k) => (
                  <li key={k} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{k}</li>
                ))}
              </ul>
              {current ? (
                <p className="mt-5 text-center text-sm font-semibold text-accent">Current plan</p>
              ) : checkout && p.monthly > 0 ? (
                <button type="button" disabled={busy !== null} onClick={() => choose(p.id)} className="mt-5 inline-flex h-9 items-center justify-center rounded-md border border-border-input text-sm font-semibold hover:bg-canvas disabled:opacity-50">
                  {busy === p.id ? "Opening checkout" : "Choose " + p.name}
                </button>
              ) : (
                <Link href="/go" className="mt-5 inline-flex h-9 items-center justify-center rounded-md border border-border-input text-sm font-semibold hover:bg-canvas">
                  {p.monthly === 0 ? "Start free" : "Choose " + p.name}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
