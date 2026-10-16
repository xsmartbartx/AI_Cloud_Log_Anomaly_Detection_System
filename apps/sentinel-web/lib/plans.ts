export type PlanId = "free" | "starter" | "pro" | "business" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number; // USD
  scans: number;
  perks: string[];
};

export const PLANS: Plan[] = [
  { id: "free", name: "Free", monthly: 0, scans: 20, perks: ["Web scans", "Built-in rules"] },
  { id: "starter", name: "Starter", monthly: 9, scans: 150, perks: ["Everything in Free", "API access"] },
  { id: "pro", name: "Pro", monthly: 29, scans: 1_500, perks: ["Everything in Starter", "Custom rules"] },
  { id: "business", name: "Business", monthly: 79, scans: 7_500, perks: ["Everything in Pro", "Priority support"] },
  { id: "scale", name: "Scale", monthly: 249, scans: 40_000, perks: ["Everything in Business", "SLA available"] },
];

export const YEARLY_DISCOUNT = 0.2;

export const planById = (id: PlanId): Plan => PLANS.find((p) => p.id === id)!;
export const yearlyPrice = (p: Plan) => Math.round(p.monthly * 12 * (1 - YEARLY_DISCOUNT) * 100) / 100;
