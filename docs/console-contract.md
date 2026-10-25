# Console contract: Linegist usage endpoint (v1)

The NEXORA Console reads each organization's Linegist usage from one read-only endpoint. This is the whole contract. Linegist does not call the Console; the Console calls Linegist.

## Request

```
GET https://linegist.onenexora.com/api/internal/usage?org=<clerk org id>
x-nexora-timestamp: <unix seconds, integer>
x-nexora-signature: <hex HMAC-SHA256>
```

- `org` is the Clerk organization id (`org_...`). For a user with no organization, Linegist uses a personal workspace keyed by the Clerk **user id** (`user_...`); pass that instead.
- `x-nexora-timestamp` is the current time in whole seconds since the epoch. Requests more than **300 seconds** away from Linegist's clock, in either direction, are rejected. Keep the Console's clock synced (NTP).
- `x-nexora-signature` is the lowercase hex of `HMAC-SHA256(key = shared secret, message = "<timestamp>.<org>")`. The message is the timestamp, a literal dot, and the org id exactly as sent in the query, with no URL encoding and no whitespace. Linegist also accepts uppercase hex.
- The shared secret is `CONSOLE_SHARED_SECRET`. Generate it with `openssl rand -hex 32`, store it in a secrets manager on both sides, and rotate it by deploying the new value to both. The signature has no key id, so a rotation needs a short overlap window agreed between you; ask for one if you need it (it is a small change).

## Response

`200`, `Content-Type: application/json`, `Cache-Control: no-store`:

```json
{ "product": "linegist", "period": "2026-10", "plan": "pro", "scansUsed": 412, "scansLimit": 1500 }
```

| field | meaning |
| --- | --- |
| `product` | always `"linegist"` |
| `period` | the UTC month being counted, `YYYY-MM`; usage resets at 00:00 UTC on the 1st |
| `plan` | `free`, `starter`, `pro`, `business` or `scale` |
| `scansUsed` | scans charged this period (a scan that failed validation is not charged) |
| `scansLimit` | the plan's monthly cap; Linegist stops scanning at the cap and never bills overage |

Additive changes only within v1: new fields may appear, existing fields keep their meaning. Ignore unknown fields.

## Errors

| status | body | meaning |
| --- | --- | --- |
| 401 | `{"error":"unauthorized"}` | missing or wrong signature, stale timestamp, malformed headers, or the secret is not configured. All of these look the same on purpose. |
| 404 | `{"error":"not_found"}` | the signature was valid but Linegist has no organization with that id (the org has never opened Linegist) |
| 5xx | | Linegist is down or the database is unreachable; retry later |

A `404` is normal for an organization that has never used Linegist. Show it as "not started", not as an error.

## Test vectors

Check your signer against these before the first real call. Message = `"<timestamp>.<org>"`.

| secret | timestamp | org | signature |
| --- | --- | --- | --- |
| `test-secret` | `1790000000` | `org_demo` | `3a0846a9293a963ee99f1705acf69e588f70f2fca79a3f87a290149816e9def9` |
| `test-secret` | `1790000000` | `org_2abc` | `35f1d2f70931628c81caa87933d13ce05b70950aeb3b46ca895cafab2c0e6d9b` |
| `another-secret` | `1790000000` | `org_demo` | `2ac60b7d20d8b89350c697052d07caedd0ecda9da60166e79f21708abf612cd8` |

They are also asserted in `apps/sentinel-web/tests/console-auth.test.ts` and match OpenSSL:

```bash
printf "1790000000.org_demo" | openssl dgst -sha256 -hmac test-secret -hex
```

## Example: Console side (Node)

```js
import { createHmac } from "node:crypto";

async function linegistUsage(orgId) {
  const ts = Math.floor(Date.now() / 1000);
  // The same secret Linegist has as CONSOLE_SHARED_SECRET. Use whatever variable name the Console prefers.
  const sig = createHmac("sha256", process.env.CONSOLE_SHARED_SECRET).update(`${ts}.${orgId}`).digest("hex");
  const res = await fetch(`https://linegist.onenexora.com/api/internal/usage?org=${encodeURIComponent(orgId)}`, {
    headers: { "x-nexora-timestamp": String(ts), "x-nexora-signature": sig },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return null;                 // org has not used Linegist yet
  if (!res.ok) throw new Error(`linegist usage ${res.status}`);
  return res.json();
}
```

`encodeURIComponent` is safe here: Clerk ids contain only letters, digits and underscores, so the signed string and the query value are identical.

## Example: curl

```bash
TS=$(date +%s); ORG=org_demo
SIG=$(printf "%s.%s" "$TS" "$ORG" | openssl dgst -sha256 -hmac "$CONSOLE_SHARED_SECRET" -hex | awk '{print $NF}')
curl -s -H "x-nexora-timestamp: $TS" -H "x-nexora-signature: $SIG" "https://linegist.onenexora.com/api/internal/usage?org=$ORG"
```

## What the Console should and should not do

- Call per organization when a page needs it, with a short timeout, and cache for about a minute. The endpoint is cheap but is not a bulk API.
- Do not forward the secret, the signature, or this URL to browsers. Call it from the Console's server.
- Keep the secret out of logs. The endpoint never logs it.
- The endpoint returns counts only. It never returns log text, findings, keys, member emails or billing details.

## Open questions for the Console owner

1. **Who owns billing?** Today Linegist runs its own Stripe checkout and keeps the plan in its database. If the Console should own billing and entitlements instead, Linegist would read the plan from the Console (the opposite direction) and this endpoint would only report usage.
2. **Key rotation:** is a short overlap window (two accepted secrets) needed?
3. **Bulk reads:** does the Console need all organizations at once (an admin overview)? That would be a second endpoint with pagination.
