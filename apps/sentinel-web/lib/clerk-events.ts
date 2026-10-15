import type { Db } from "./db";

/** Deletion sync (GDPR). The event id and the deletion commit together, so a failed delete is retried, not skipped. */
export async function applyClerkEvent(db: Db, id: string, evt: { type: string; data: { id?: string } }): Promise<"applied" | "duplicate" | "ignored"> {
  return db.tx(async (q) => {
    const fresh = await q("insert into webhook_events (id, provider) values ($1,'clerk') on conflict do nothing returning id", [id]);
    if (fresh.length === 0) return "duplicate";
    if (evt.type === "user.deleted" && evt.data.id) {
      await q("delete from members where clerk_user_id=$1", [evt.data.id]);
      return "applied";
    }
    if (evt.type === "organization.deleted" && evt.data.id) {
      await q("delete from organizations where clerk_org_id=$1", [evt.data.id]);
      return "applied";
    }
    return "ignored";
  });
}
