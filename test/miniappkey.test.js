import { test } from "node:test";
import assert from "node:assert/strict";
import { signKey, verifyKey, b64urlEncode } from "../src/lib/miniappkey.js";

const secret = "s3cret-s3cret-s3cret-s3cret-0123";
const now = 1_000_000;
const base = { uid: "u1", name: "Eric", trip: "t1", app: "ss", exp: now + 3600 };
const v = (k, o = {}) => verifyKey(k, { secret, app: "ss", now, ...o });
const enc = new TextEncoder();

test("valid key round-trips", async () => {
  assert.deepEqual(await v(await signKey(base, secret)), base);
});
test("tampered payload refused", async () => {
  const [, sig] = (await signKey(base, secret)).split(".");
  const forged = b64urlEncode(enc.encode(JSON.stringify({ ...base, uid: "u2" })));
  assert.equal(await v(`${forged}.${sig}`), null);
});
test("tampered signature refused", async () => {
  const [body, sig] = (await signKey(base, secret)).split(".");
  const bad = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  assert.equal(await v(`${body}.${bad}`), null);
});
test("wrong secret refused", async () => {
  assert.equal(await v(await signKey(base, "another-secret-another-secret-00")), null);
});
test("expired refused", async () => {
  assert.equal(await v(await signKey({ ...base, exp: now - 1 }, secret)), null);
  assert.equal(await v(await signKey({ ...base, exp: now }, secret)), null);
});
test("wrong app refused", async () => {
  assert.equal(await v(await signKey({ ...base, app: "other" }, secret)), null);
});
test("missing / non-integer exp refused", async () => {
  const { exp, ...noExp } = base;
  assert.equal(await v(await signKey(noExp, secret)), null);
  assert.equal(await v(await signKey({ ...base, exp: String(now + 60) }, secret)), null);
  assert.equal(await v(await signKey({ ...base, exp: now + 60.5 }, secret)), null);
});
test("exp too far ahead refused", async () => {
  assert.equal(await v(await signKey({ ...base, exp: now + 26 * 3600 }, secret)), null);
});
test("missing uid / trip refused", async () => {
  assert.equal(await v(await signKey({ ...base, uid: "" }, secret)), null);
  assert.equal(await v(await signKey({ ...base, trip: undefined }, secret)), null);
});
test("malformed input refused", async () => {
  const k = await signKey(base, secret);
  for (const bad of [null, undefined, "", ".", "a", "a.b.c", `${k}.x`, "!!!.???", k + "A".repeat(3000), `${k.split(".")[0]}+/.${k.split(".")[1]}`]) {
    assert.equal(await v(bad), null, String(bad).slice(0, 20));
  }
});
test("missing secret refused", async () => {
  assert.equal(await v(await signKey(base, secret), { secret: "" }), null);
});
test("validly signed but overlong key refused", async () => {
  const k = await signKey({ ...base, name: "x".repeat(3000) }, secret);
  assert.ok(k.length > 2048);
  assert.equal(await v(k), null);
});

// The contract with the app. The same key is pinned in armstrong-ios
// `functions/test/miniappkey.test.ts`, whose signer is a separate
// implementation (Node's createHmac, not Web Crypto). If either side changes
// its encoding, one of the two suites goes red instead of every visitor quietly
// getting a 403. The name is non-ASCII on purpose: UTF-8 inside base64 is where
// two encoders are likeliest to disagree.
const VECTOR_SECRET = "contract-vector-secret-not-a-real-one-0123";
const VECTOR_PAYLOAD = { uid: "uid_eric", name: "Éric “E” Armstrong", trip: "trip_steamboat", app: "ss", exp: 1798761600 };
const VECTOR_KEY =
  "eyJ1aWQiOiJ1aWRfZXJpYyIsIm5hbWUiOiLDiXJpYyDigJxF4oCdIEFybXN0cm9uZyIsInRyaXAiOiJ0cmlwX3N0ZWFtYm9hdCIsImFwcCI6InNzIiwiZXhwIjoxNzk4NzYxNjAwfQ" +
  ".Wdq-wgsB4giZwjaFw74FKkhaT224d5E4wdDjq8LgRAA";

test("the app's contract vector verifies to exactly its payload", async () => {
  const claims = await verifyKey(VECTOR_KEY, { secret: VECTOR_SECRET, app: "ss", now: VECTOR_PAYLOAD.exp - 60 });
  assert.deepEqual(claims, VECTOR_PAYLOAD);
});
test("and this side signs it byte for byte", async () => {
  assert.equal(await signKey(VECTOR_PAYLOAD, VECTOR_SECRET), VECTOR_KEY);
});
