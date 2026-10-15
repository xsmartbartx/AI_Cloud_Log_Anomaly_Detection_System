import type { Db } from "./db";
import type { Role } from "./authz";

export type Identity = { clerkOrgId: string; orgName: string; clerkUserId: string; role: Role; email?: string };
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Find or create the org and member rows for a verified identity. The common case, a returning
 * member whose role has not changed, is two reads and no writes, and never calls the identity provider.
 * getEmail is only called when a member row is created.
 */
export async function provision(db: Db, who: Identity, getEmail: () => Promise<string | undefined>): Promise<{ org: Row; member: Row }> {
  let org = (await db.query<Row>("select * from organizations where clerk_org_id=$1", [who.clerkOrgId]))[0];
  if (!org) {
    org = (await db.query<Row>(
      `insert into organizations (clerk_org_id, name) values ($1,$2)
       on conflict (clerk_org_id) do update set updated_at = organizations.updated_at returning *`, [who.clerkOrgId, who.orgName]))[0];
  }
  let member = (await db.query<Row>("select id, clerk_user_id, email, role from members where org_id=$1 and clerk_user_id=$2", [org.id, who.clerkUserId]))[0];
  if (!member) {
    const email = who.email ?? (await getEmail()) ?? "";
    member = (await db.query<Row>(
      `insert into members (org_id, clerk_user_id, email, role) values ($1,$2,$3,$4)
       on conflict (org_id, clerk_user_id) do update set role = excluded.role, updated_at = now()
       returning id, clerk_user_id, email, role`, [org.id, who.clerkUserId, email, who.role]))[0];
  } else if (member.role !== who.role) {
    member = (await db.query<Row>("update members set role=$2, updated_at=now() where id=$1 returning id, clerk_user_id, email, role", [member.id, who.role]))[0];
  }
  return { org, member };
}
