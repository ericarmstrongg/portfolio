import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/worker.js";
import { signKey } from "../src/lib/miniappkey.js";

const secret = "s3cret-s3cret-s3cret-s3cret-0123";
const now = 1_000_000;
const roster = {
  TRIP: "t1",
  MAX_GIFTS: 3,
  ORGANIZERS: ["anne"],
  ADULTS: ["eric", "tom", "luisa", "anne", "rob"].map((id) => ({ id, name: id.toUpperCase(), uid: "uid_" + id })),
  KIDS: [{ id: "margot", name: "Margot", parents: ["tom", "luisa"] }],
};

/** The same contract as `d1Store`, in memory: unfiltered rows, author-scoped edits. */
function mem() {
  const about = {}; const assigns = {}; let hints = []; let next = 1;
  return {
    getAbout: async () => structuredClone(about),
    setAbout: async (id, gift, book) => { about[id] = { gift, book }; },
    getAssignment: async (g) => [...(assigns[g] || [])],
    getAllAssignments: async () => Object.entries(assigns).flatMap(([giver, rows]) => rows.map((r) => ({ giver, ...r }))),
    setAssignment: async (g, rows) => { assigns[g] = rows; },
    getHints: async () => hints.map((h) => ({ ...h })),
    addHint: async (subject, author, text) => { const id = next++; hints.push({ id, subject, author, text }); return id; },
    updateHint: async (id, author, text) => { const h = hints.find((x) => x.id === id && x.author === author); if (h) h.text = text; return h ? 1 : 0; },
    deleteHint: async (id, author) => { const n = hints.length; hints = hints.filter((x) => !(x.id === id && x.author === author)); return n - hints.length; },
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
const me = async (h, cookie) => (await api(h, cookie, "/me")).json();
const personIn = (view, id) => view.people.find((p) => p.id === id);

// ── The gate ───────────────────────────────────────────────────────────────────

test("bare visit, garbage and tampered keys get 403", async () => {
  const h = mk();
  assert.equal((await h(req("/ss/"), env)).status, 403);
  assert.equal((await h(req("/ss/api/me"), env)).status, 403);
  assert.equal((await h(req("/ss/?k=abc"), env)).status, 403);
  const k = await key("uid_tom");
  assert.equal((await h(req("/ss/?k=" + k.slice(0, -2) + "zz"), env)).status, 403);
  assert.equal((await h(req("/ss/", { headers: { Cookie: "__Host-ms_ss=junk" } }), env)).status, 403);
});
test("a refused visit gets the same explanatory page whatever the reason, naming nobody", async () => {
  const h = mk();
  const pages = [];
  for (const r of [req("/ss/"), req("/ss/?k=abc"), req("/ss/", { headers: { Cookie: "__Host-ms_ss=" + (await key("uid_stranger")) } }), req("/ss/?k=" + (await key("uid_tom", { exp: now - 1 })))]) {
    const res = await h(r, env);
    assert.equal(res.status, 403);
    assert.match(res.headers.get("Content-Type"), /^text\/html/);
    assert.match(res.headers.get("X-Robots-Tag"), /noindex/);
    assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
    pages.push(await res.text());
  }
  // One page for every cause — a different one would tell a stranger which check they failed.
  assert.equal(new Set(pages).size, 1);
  assert.match(pages[0], /Majestic app/);
  for (const p of [...roster.ADULTS, ...roster.KIDS]) assert.ok(!pages[0].includes(p.name), `names ${p.name}`);
  assert.ok(!pages[0].includes(roster.TRIP + '"'));
});
test("a refused API call gets JSON, not the page", async () => {
  const res = await mk()(req("/ss/api/me"), env);
  assert.equal(res.status, 403);
  assert.match(res.headers.get("Content-Type"), /^application\/json/);
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
test("cookie for another trip is refused", async () => {
  const h = mk();
  const c = "__Host-ms_ss=" + (await key("uid_tom", { trip: "t2" }));
  assert.equal((await h(req("/ss/api/me", { headers: { Cookie: c } }), env)).status, 403);
});
test("state changes need JSON and same origin", async () => {
  const h = mk(); const c = await session(h, "tom");
  const noJson = await h(req("/ss/api/about", { method: "PUT", headers: { Cookie: c }, body: "{}" }), env);
  assert.equal(noJson.status, 400);
  const cross = await h(req("/ss/api/about", { method: "PUT", headers: { Cookie: c, "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" }), env);
  assert.equal(cross.status, 403);
});

// ── Who you are ────────────────────────────────────────────────────────────────

test("two people see their own identity, and never themselves in the list", async () => {
  const h = mk();
  const tom = await me(h, await session(h, "tom"));
  assert.equal(tom.me.id, "tom");
  assert.ok(!personIn(tom, "tom"));
  assert.equal((await me(h, await session(h, "luisa"))).me.id, "luisa");
});

// ── Assignments: the giver only ────────────────────────────────────────────────

test("an assignment is gifts and a book, read back in roster order", async () => {
  const h = mk(); const eric = await session(h, "eric");
  assert.equal((await api(h, eric, "/assignment", "PUT", { gifts: ["rob", "anne"], book: "tom" })).status, 200);
  assert.deepEqual((await me(h, eric)).assignment, { gifts: ["anne", "rob"], book: "tom" });
});

test("nobody else can see your assignment", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  await api(h, eric, "/assignment", "PUT", { gifts: ["rob", "anne"], book: "tom" });
  assert.deepEqual((await me(h, tom)).assignment, { gifts: [], book: null });
  // And a person's entry carries nothing about who they're buying for — the key set is pinned, so a field
  // added later has to be added here on purpose.
  assert.deepEqual(Object.keys(personIn(await me(h, tom), "eric")).sort(), ["about", "canEdit", "hints", "id", "kid", "name"]);
});

test("saving again replaces rather than adds", async () => {
  const h = mk(); const eric = await session(h, "eric");
  await api(h, eric, "/assignment", "PUT", { gifts: ["rob", "anne"], book: "tom" });
  await api(h, eric, "/assignment", "PUT", { gifts: ["luisa"], book: null });
  assert.deepEqual((await me(h, eric)).assignment, { gifts: ["luisa"], book: null });
});

test("assignments refuse yourself, kids, strangers, repeats and too many", async () => {
  const h = mk(); const eric = await session(h, "eric");
  for (const body of [
    { gifts: ["eric"], book: null },
    { gifts: [], book: "eric" },
    { gifts: ["margot"], book: null },
    { gifts: [], book: "margot" },
    { gifts: ["nobody"], book: null },
    { gifts: ["rob", "rob"], book: null },
    { gifts: ["rob", "anne", "tom", "luisa"], book: null },
    { gifts: "rob", book: null },
    { gifts: [], book: 3 },
  ]) assert.equal((await api(h, eric, "/assignment", "PUT", body)).status, 400, JSON.stringify(body));
});

// ── About: everybody reads, you (and a kid's parents) write ────────────────────

test("what you write about yourself is what everybody else reads", async () => {
  const h = mk(); const tom = await session(h, "tom"); const anne = await session(h, "anne");
  assert.equal((await api(h, tom, "/about", "PUT", { person: "tom", gift: "fly fishing", book: "sea stories" })).status, 200);
  assert.deepEqual((await me(h, tom)).me.about, { gift: "fly fishing", book: "sea stories" });
  assert.deepEqual(personIn(await me(h, anne), "tom").about, { gift: "fly fishing", book: "sea stories" });
});

test("a kid's about is written by either parent and nobody else", async () => {
  const h = mk(); const tom = await session(h, "tom"); const luisa = await session(h, "luisa"); const anne = await session(h, "anne");
  assert.equal((await api(h, tom, "/about", "PUT", { person: "margot", gift: "lego", book: "" })).status, 200);
  assert.equal((await api(h, luisa, "/about", "PUT", { person: "margot", gift: "lego, paints", book: "" })).status, 200);
  assert.equal((await api(h, anne, "/about", "PUT", { person: "margot", gift: "x", book: "" })).status, 403);
  assert.equal((await api(h, anne, "/about", "PUT", { person: "tom", gift: "x", book: "" })).status, 403);
  const view = await me(h, anne);
  assert.equal(personIn(view, "margot").about.gift, "lego, paints");
  assert.equal(personIn(view, "margot").canEdit, false);
  assert.equal(personIn(await me(h, tom), "margot").canEdit, true);
});

test("about refuses missing fields and runaway text", async () => {
  const h = mk(); const tom = await session(h, "tom");
  assert.equal((await api(h, tom, "/about", "PUT", { person: "tom", gift: "x" })).status, 400);
  assert.equal((await api(h, tom, "/about", "PUT", { person: "tom", gift: "x".repeat(5000), book: "" })).status, 400);
});

// ── Hints: everybody but the subject ───────────────────────────────────────────

test("a hint is hidden from the person it's about and shown to everyone else", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom"); const anne = await session(h, "anne");
  assert.equal((await api(h, eric, "/hints", "POST", { subject: "tom", text: "  wants a new reel  " })).status, 200);

  const anneView = personIn(await me(h, anne), "tom");
  assert.deepEqual(anneView.hints.map((x) => [x.author, x.text, x.mine]), [["ERIC", "wants a new reel", false]]);
  assert.equal(personIn(await me(h, eric), "tom").hints[0].mine, true);

  // The whole response, not just the obvious field: the subject must not be able to find it anywhere.
  const tomView = await me(h, tom);
  assert.ok(!JSON.stringify(tomView).includes("reel"));
});

test("hints about a kid are visible to the parents too", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  await api(h, eric, "/hints", "POST", { subject: "margot", text: "loves horses" });
  assert.equal(personIn(await me(h, tom), "margot").hints[0].text, "loves horses");
});

test("you can't write a hint about yourself, nobody, or nothing", async () => {
  const h = mk(); const tom = await session(h, "tom");
  for (const body of [{ subject: "tom", text: "x" }, { subject: "nobody", text: "x" }, { subject: "anne", text: "   " }, { subject: "anne", text: "x".repeat(2001) }])
    assert.equal((await api(h, tom, "/hints", "POST", body)).status, 400, JSON.stringify(body));
});

test("only a hint's author can change or delete it", async () => {
  const h = mk(); const eric = await session(h, "eric"); const anne = await session(h, "anne");
  const { id } = await (await api(h, eric, "/hints", "POST", { subject: "tom", text: "reel" })).json();

  assert.equal((await api(h, anne, `/hints/${id}`, "PUT", { text: "socks" })).status, 404);
  assert.equal((await api(h, anne, `/hints/${id}`, "DELETE", {})).status, 404);
  assert.equal(personIn(await me(h, anne), "tom").hints[0].text, "reel");

  assert.equal((await api(h, eric, `/hints/${id}`, "PUT", { text: "a better reel" })).status, 200);
  assert.equal(personIn(await me(h, anne), "tom").hints[0].text, "a better reel");
  assert.equal((await api(h, eric, `/hints/${id}`, "DELETE", {})).status, 200);
  assert.equal(personIn(await me(h, anne), "tom").hints.length, 0);
});

test("the subject can't reach a hint about them by id either", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  const { id } = await (await api(h, eric, "/hints", "POST", { subject: "tom", text: "reel" })).json();
  assert.equal((await api(h, tom, `/hints/${id}`)).status, 404, "no GET by id exists");
  assert.equal((await api(h, tom, `/hints/${id}`, "DELETE", {})).status, 404);
  assert.equal(personIn(await me(h, eric), "tom").hints.length, 1);
});

test("the draw is gone", async () => {
  const h = mk(); const eric = await session(h, "eric");
  assert.equal((await api(h, eric, "/draw", "POST", {})).status, 404);
});

// ── Organizer: Anne sets everybody's ───────────────────────────────────────────

test("the organizer is told so, and nobody else is", async () => {
  const h = mk();
  assert.equal((await me(h, await session(h, "anne"))).isOrganizer, true);
  assert.equal((await me(h, await session(h, "eric"))).isOrganizer, false);
});

test("the organizer sets somebody's assignment and they see it as theirs", async () => {
  const h = mk(); const anne = await session(h, "anne"); const eric = await session(h, "eric");
  assert.equal((await api(h, anne, "/assignments/eric", "PUT", { gifts: ["rob", "luisa"], book: "tom" })).status, 200);
  assert.deepEqual((await me(h, eric)).assignment, { gifts: ["luisa", "rob"], book: "tom" });
});

test("the organizer reads every giver, including ones nobody has entered", async () => {
  const h = mk(); const anne = await session(h, "anne"); const eric = await session(h, "eric");
  await api(h, eric, "/assignment", "PUT", { gifts: ["rob"], book: "tom" });
  const { givers } = await (await api(h, anne, "/assignments")).json();
  assert.deepEqual(givers.map((g) => g.id), ["eric", "tom", "luisa", "anne", "rob"]);
  assert.deepEqual(givers.find((g) => g.id === "eric"), { id: "eric", name: "ERIC", gifts: ["rob"], book: "tom" });
  assert.deepEqual(givers.find((g) => g.id === "tom"), { id: "tom", name: "TOM", gifts: [], book: null });
});

test("nobody but the organizer can read or set anybody else's", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  await api(h, tom, "/assignment", "PUT", { gifts: ["rob"], book: null });
  assert.equal((await api(h, eric, "/assignments")).status, 403);
  assert.equal((await api(h, eric, "/assignments/tom", "PUT", { gifts: ["anne"], book: null })).status, 403);
  assert.deepEqual((await me(h, tom)).assignment, { gifts: ["rob"], book: null });
});

test("an organizer can't give somebody themselves, a kid, or a stranger", async () => {
  const h = mk(); const anne = await session(h, "anne");
  for (const [giver, body] of [
    ["eric", { gifts: ["eric"], book: null }],
    ["eric", { gifts: [], book: "eric" }],
    ["eric", { gifts: ["margot"], book: null }],
    ["margot", { gifts: ["rob"], book: null }],
    ["nobody", { gifts: ["rob"], book: null }],
  ]) assert.equal((await api(h, anne, `/assignments/${giver}`, "PUT", body)).status, 400, giver + JSON.stringify(body));
});

test("being the organizer doesn't reveal hints about yourself", async () => {
  const h = mk(); const eric = await session(h, "eric"); const anne = await session(h, "anne");
  await api(h, eric, "/hints", "POST", { subject: "anne", text: "wants a chef's knife" });
  assert.ok(!JSON.stringify(await me(h, anne)).includes("chef"));
  assert.ok(!JSON.stringify(await (await api(h, anne, "/assignments")).json()).includes("chef"));
});
