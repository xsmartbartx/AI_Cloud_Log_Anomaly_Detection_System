import { redirect } from "next/navigation";
import { getDb } from "./db";
import type { Ctx, Org } from "./store";
import type { Role } from "./authz";

export const clerkEnabled = () => !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Identity = { clerkOrgId: string; orgName: string; clerkUserId: string; role: Role; email?: string };

async function identity(): Promise<Identity> {
  if (clerkEnabled()) {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const a = await auth();
    if (!a.userId) redirect("/sign-in");
    // Users without an organization get a personal workspace keyed by their user id.
    const clerkOrgId = a.orgId ?? a.userId;
    const role: Role = !a.orgId || a.orgRole === "org:admin" ? "owner" : "member";
    let email: string | undefined;
    try { email = (await (await clerkClient()).users.getUser(a.userId)).primaryEmailAddress?.emailAddress; } catch { /* filled on next load */ }
    return { clerkOrgId, orgName: a.orgSlug ?? "Personal workspace", clerkUserId: a.userId, role, email };
  }
  if (process.env.NODE_ENV === "production") throw new Error("Authentication is not configured. Set the Clerk environment variables.");
  return { clerkOrgId: "org_demo", orgName: "Acme Platform Team", clerkUserId: "user_demo", role: "owner", email: "you@acme.test" };
}

/** Verified session, with the org and member rows created on first sight. */
export async function requireCtx(): Promise<Ctx> {
  const who = await identity();
  const db = await getDb();
  const [o] = await db.query<Record<string, any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
    `insert into organizations (clerk_org_id, name) values ($1,$2)
     on conflict (clerk_org_id) do update set updated_at = organizations.updated_at returning *`, [who.clerkOrgId, who.orgName]);
  const [m] = await db.query<Record<string, any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
    `insert into members (org_id, clerk_user_id, email, role) values ($1,$2,$3,$4)
     on conflict (org_id, clerk_user_id) do update set role = excluded.role, email = coalesce(nullif(excluded.email,''), members.email), updated_at = now()
     returning id, clerk_user_id, email, role`, [o.id, who.clerkUserId, who.email ?? "", who.role]);
  const { orgFromRow } = await import("./store");
  const org: Org = orgFromRow(o);
  return { org, member: { id: m.id, clerkUserId: m.clerk_user_id, email: m.email, role: m.role } };
}
