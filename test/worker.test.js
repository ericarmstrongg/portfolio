import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/worker.js";
import { signKey } from "../src/lib/miniappkey.js";

const secret = "s3cret-s3cret-s3cret-s3cret-0123";
const now = 1_000_000;
const roster = {
  TRIP: "t1", ORGANIZER: "eric", EXCLUDE: [],
  ADULTS: ["eric", "tom", "luisa", "ann"].map((id) => ({ id, name: id, uid: "uid_" + id })),
  KIDS: [{ id: "margot", name: "Margot", parents: ["tom"] }],
};
function mem() {
  const lists = {}; let assigns = [];
  return {
    getWishlists: async () => ({ ...lists }), setWishlist: async (id, t) => { lists[id] = t; },
    getAssignments: async () => [...assigns], saveDraw: async (rows) => { assigns = rows; },
  };
}
const env = { MINIAPP_KEY_SECRET: secret, ASSETS: { fetch: async (r) => new Response("asset:" + new URL(r.url).pathname) } };
const mk = () => { const s = mem(); return createHandler({ roster, now: () => now, store: () => s }); };
const key = (uid, o = {}) => signKey({ uid, name: uid, trip: "t1", app: "ss", exp: now + 3600, ...o }, secret);
const req = (path, init) => new Request("https://ericarmstrong.tech" + path, init);

async function session(h, who) {
  const res = await h(req("/ss/?k=" + (await key("uid_" + who))), env);
  assert.equal(res.status, 302);
  return res.headers.get("Set-Cookie").split(";")[0];
}
const api = (h, cookie, path, method = "GET", body) =>
  h(req("/ss/api" + path, { method, headers: { Cookie: cookie, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) }), env);

test("bare visit, garbage and tampered keys get 403", async () => {
  const h = mk();
  assert.equal((await h(req("/ss/"), env)).status, 403);
  assert.equal((await h(req("/ss/api/me"), env)).status, 403);
  assert.equal((await h(req("/ss/?k=abc"), env)).status, 403);
  const k = await key("uid_tom");
  assert.equal((await h(req("/ss/?k=" + k.slice(0, -2) + "zz"), env)).status, 403);
  assert.equal((await h(req("/ss/", { headers: { Cookie: "__Host-ms_ss=junk" } }), env)).status, 403);
});
test("403 carries no hints and is noindex", async () => {
  const res = await mk()(req("/ss/"), env);
  assert.equal(await res.text(), "no permission");
  assert.match(res.headers.get("X-Robots-Tag"), /noindex/);
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
});
test("valid key sets cookie and redirects without k", async () => {
  const res = await mk()(req("/ss/?x=1&k=" + (await key("uid_tom"))), env);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "/ss/?x=1");
  const c = res.headers.get("Set-Cookie");
  assert.match(c, /^__Host-ms_ss=/); assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /Path=\//); assert.match(c, /Max-Age=3600/);
});
test("wrong trip, wrong app, expired, unrostered uid refused", async () => {
  const h = mk();
  for (const k of [await key("uid_tom", { trip: "t2" }), await key("uid_tom", { app: "x" }), await key("uid_tom", { exp: now - 1 })])
    assert.equal((await h(req("/ss/?k=" + k), env)).status, 403);
  const c = "__Host-ms_ss=" + (await key("uid_stranger"));
  assert.equal((await h(req("/ss/", { headers: { Cookie: c } }), env)).status, 403);
});
test("cookie serves the page; landing page bypasses the gate", async () => {
  const h = mk(); const c = await session(h, "tom");
  const page = await h(req("/ss/", { headers: { Cookie: c } }), env);
  assert.equal(await page.text(), "asset:/ss/");
  assert.equal(await (await h(req("/"), env)).text(), "asset:/");
});
test("two people see their own identity", async () => {
  const h = mk();
  assert.equal((await (await api(h, await session(h, "tom"), "/me")).json()).me.id, "tom");
  assert.equal((await (await api(h, await session(h, "luisa"), "/me")).json()).me.id, "luisa");
});
test("wishlists: own and own kid only", async () => {
  const h = mk(); const tom = await session(h, "tom"); const luisa = await session(h, "luisa");
  assert.equal((await api(h, tom, "/wishlist", "PUT", { person: "tom", text: "socks" })).status, 200);
  assert.equal((await api(h, tom, "/wishlist", "PUT", { person: "margot", text: "lego" })).status, 200);
  assert.equal((await api(h, luisa, "/wishlist", "PUT", { person: "margot", text: "x" })).status, 403, "non-parent");
  assert.equal((await api(h, luisa, "/wishlist", "PUT", { person: "tom", text: "x" })).status, 403, "someone else's");
  assert.equal((await api(h, tom, "/wishlist", "PUT", { person: "tom", text: "x".repeat(5000) })).status, 400);
  const me = await (await api(h, tom, "/me")).json();
  assert.equal(me.kids[0].wishlist, "lego");
  assert.equal((await (await api(h, luisa, "/me")).json()).kids.length, 0);
});
test("state changes need JSON and same origin", async () => {
  const h = mk(); const c = await session(h, "tom");
  const noJson = await h(req("/ss/api/wishlist", { method: "PUT", headers: { Cookie: c }, body: "{}" }), env);
  assert.equal(noJson.status, 400);
  const cross = await h(req("/ss/api/wishlist", { method: "PUT", headers: { Cookie: c, "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" }), env);
  assert.equal(cross.status, 403);
});
test("draw: organizer only, once, private results", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  assert.equal((await api(h, tom, "/draw", "POST", {})).status, 403);
  const res = await api(h, eric, "/draw", "POST", {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal((await api(h, eric, "/draw", "POST", {})).status, 409);
  const mine = await (await api(h, tom, "/me")).json();
  assert.equal(mine.drawn, true);
  assert.ok(mine.assignments.length >= 1);
  assert.ok(mine.assignments.every((a) => a.id !== "tom" && a.id !== "margot"), "not self or own child");
  assert.equal((await api(h, tom, "/assignments")).status, 404);
});
test("cookie for another trip is refused", async () => {
  const h = mk();
  const c = "__Host-ms_ss=" + (await key("uid_tom", { trip: "t2" }));
  assert.equal((await h(req("/ss/api/me", { headers: { Cookie: c } }), env)).status, 403);
});
