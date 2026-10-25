import { test } from "node:test";
import assert from "node:assert/strict";
import { signConsoleRequest, verifyConsoleRequest, CONSOLE_WINDOW_SECONDS } from "../lib/console-auth";

// Fixed vectors, also printed in docs/console-contract.md so the Console side can check its own signer.
const VECTORS = [
  { secret: "test-secret", ts: "1790000000", org: "org_demo", sig: "3a0846a9293a963ee99f1705acf69e588f70f2fca79a3f87a290149816e9def9" },
  { secret: "test-secret", ts: "1790000000", org: "org_2abc", sig: "35f1d2f70931628c81caa87933d13ce05b70950aeb3b46ca895cafab2c0e6d9b" },
  { secret: "another-secret", ts: "1790000000", org: "org_demo", sig: "2ac60b7d20d8b89350c697052d07caedd0ecda9da60166e79f21708abf612cd8" },
];

test("signer matches the published vectors", () => {
  for (const v of VECTORS) assert.equal(signConsoleRequest(v.secret, v.ts, v.org), v.sig);
});

const base = { secret: "test-secret", org: "org_demo", timestamp: "1790000000", signature: VECTORS[0].sig, nowSeconds: 1790000000 };

test("a correct, fresh request is accepted", () => {
  assert.deepEqual(verifyConsoleRequest(base), { ok: true });
});

test("replay window is five minutes either side", () => {
  assert.equal(verifyConsoleRequest({ ...base, nowSeconds: 1790000000 + CONSOLE_WINDOW_SECONDS }).ok, true);
  assert.deepEqual(verifyConsoleRequest({ ...base, nowSeconds: 1790000000 + CONSOLE_WINDOW_SECONDS + 1 }), { ok: false, reason: "stale" });
  assert.deepEqual(verifyConsoleRequest({ ...base, nowSeconds: 1790000000 - CONSOLE_WINDOW_SECONDS - 1 }), { ok: false, reason: "stale" });
});

test("tampering with org, timestamp or secret is rejected", () => {
  assert.deepEqual(verifyConsoleRequest({ ...base, org: "org_2abc" }), { ok: false, reason: "bad_signature" });
  assert.deepEqual(verifyConsoleRequest({ ...base, secret: "another-secret" }), { ok: false, reason: "bad_signature" });
  const sig2 = signConsoleRequest("test-secret", "1790000001", "org_demo");
  assert.deepEqual(verifyConsoleRequest({ ...base, signature: sig2 }), { ok: false, reason: "bad_signature" });
});

test("malformed input and a missing secret are rejected without throwing", () => {
  assert.deepEqual(verifyConsoleRequest({ ...base, secret: undefined }), { ok: false, reason: "not_configured" });
  assert.deepEqual(verifyConsoleRequest({ ...base, secret: "" }), { ok: false, reason: "not_configured" });
  for (const bad of [{ org: "" }, { timestamp: "abc" }, { timestamp: "" }, { timestamp: "-5" }, { signature: "" }, { signature: "zz".repeat(32) }, { signature: "abcd" }]) {
    assert.deepEqual(verifyConsoleRequest({ ...base, ...bad }), { ok: false, reason: "bad_request" }, JSON.stringify(bad));
  }
});

test("uppercase hex signatures are accepted (case-insensitive hex)", () => {
  assert.equal(verifyConsoleRequest({ ...base, signature: VECTORS[0].sig.toUpperCase() }).ok, true);
});
