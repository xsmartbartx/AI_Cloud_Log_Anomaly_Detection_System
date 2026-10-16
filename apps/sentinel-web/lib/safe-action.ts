import { ForbiddenError } from "./authz";

/** For form actions that cannot show an error: a role problem is a no-op, not a crashed page. The UI hides the control anyway. */
export async function noopIfForbidden(fn: () => Promise<unknown>): Promise<void> {
  try { await fn(); } catch (e) { if (!(e instanceof ForbiddenError)) throw e; }
}
