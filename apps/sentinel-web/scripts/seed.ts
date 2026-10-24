import { join } from "node:path";
import { createPgDb, createPgliteDb, migrate } from "../lib/db";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed production.");
  const db = process.env.DATABASE_URL ? createPgDb(process.env.DATABASE_URL) : await createPgliteDb(join(process.env.SENTINEL_DATA_DIR ?? join(process.cwd(), ".data"), "pglite"));
  try {
    await migrate(db);
    const [org] = await db.query<{ id: string }>(
      `insert into organizations (clerk_org_id, name, plan) values ('org_demo','Acme Platform Team','starter')
       on conflict (clerk_org_id) do update set name = excluded.name returning id`);
    await db.query(
      `insert into members (org_id, clerk_user_id, email, role) values ($1,'user_demo_owner','owner@acme.test','owner'), ($1,'user_demo_member','member@acme.test','member')
       on conflict (org_id, clerk_user_id) do nothing`, [org.id]);
    console.log("Seeded demo organization org_demo.");
  } finally {
    await db.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
