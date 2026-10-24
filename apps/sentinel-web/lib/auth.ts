import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { orgFromRow, type Ctx } from "./store";
import type { Role } from "./authz";
import { provision, type Identity } from "./provision";
import { PLANS, type PlanId } from "./plans";

export const clerkEnabled = () => !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const ROLES: Role[] = ["owner", "admin", "member"];

async function identity(): Promise<Identity & { getEmail: () => Promise<string | undefined> }> {
  if (clerkEnabled()) {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const a = await auth();
    if (!a.userId) redirect("/sign-in");
    const userId = a.userId;
    // Users without an organization get a personal workspace keyed by their user id.
    const role: Role = !a.orgId || a.orgRole === "org:admin" ? "owner" : "member";
    return {
      clerkOrgId: a.orgId ?? userId, orgName: a.orgSlug ?? "Personal workspace", clerkUserId: userId, role,
      getEmail: async () => {
        try { return (await (await clerkClient()).users.getUser(userId)).primaryEmailAddress?.emailAddress; } catch { return undefined; }
      },
    };
  }
  if (process.env.NODE_ENV === "production") throw new Error("Authentication is not configured. Set the Clerk environment variables.");
  // Local development only. DEMO_ROLE lets the e2e suite exercise the member role.
  const role = ROLES.find((r) => r === process.env.DEMO_ROLE) ?? "owner";
  // DEMO_PLAN gives the e2e suite enough scans; it only applies when the demo org is first created.
  const plan: PlanId = PLANS.find((p) => p.id === process.env.DEMO_PLAN)?.id ?? "free";
  return { clerkOrgId: "org_demo", orgName: "Acme Platform Team", clerkUserId: `user_demo_${role}`, role, email: `${role}@acme.test`, plan, getEmail: async () => undefined };
}

/** Verified session with org and member rows. Resolved once per request (React cache), and no writes for a returning member. */
export const requireCtx = cache(async (): Promise<Ctx> => {
  const who = await identity();
  const { org, member } = await provision(await getDb(), who, who.getEmail);
  return { org: orgFromRow(org), member: { id: member.id, clerkUserId: member.clerk_user_id, email: member.email, role: member.role } };
});
