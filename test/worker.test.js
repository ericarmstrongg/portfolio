import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/worker.js";
import { signKey } from "../src/lib/miniappkey.js";
import { DETAIL_FIELDS, MAX_DETAIL, readDetails } from "../src/details.js";

const secret = "s3cret-s3cret-s3cret-s3cret-0123";
const now = 1_000_000;
const roster = {
  TRIP: "t1",
  MAX_GIFTS: 3,
  ORGANIZERS: ["anne"],
  ADULTS: ["eric", "tom", "luisa", "anne", "rob"].map((id) => ({ id, name: id.toUpperCase(), uid: "uid_" + id })),
  KIDS: [{ id: "margot", name: "Margot", parents: ["tom", "luisa"] }],
  BOOK_COUPLES: [["rob", "anne"]],
};

/** The same contract as `d1Store`, in memory: unfiltered rows, author-scoped edits. */
function mem() {
  const about = {}; const assigns = {}; let hints = []; let next = 1; let bought = [];
  return {
    getAbout: async () => structuredClone(about),
    setAbout: async (id, gift, book, details, t) => { about[id] = { gift, book, details: details ?? about[id]?.details ?? {}, updated: t }; },
    getAssignment: async (g) => [...(assigns[g] || [])],
    getAllAssignments: async () => Object.entries(assigns).flatMap(([giver, rows]) => rows.map((r) => ({ giver, ...r }))),
    setAssignment: async (g, rows) => { assigns[g] = rows; },
    getAllBought: async () => bought.map((b) => ({ ...b })),
    setBought: async (giver, receiver, kind, on) => {
      bought = bought.filter((b) => !(b.giver === giver && b.receiver === receiver && b.kind === kind));
      if (on) bought.push({ giver, receiver, kind });
    },
    getHints: async () => hints.map((h) => ({ ...h })),
    addHint: async (subject, author, text, t) => { const id = next++; hints.push({ id, subject, author, text, updated: t }); return id; },
    updateHint: async (id, author, text, t) => { const h = hints.find((x) => x.id === id && x.author === author); if (h) { h.text = text; h.updated = t; } return h ? 1 : 0; },
    deleteHint: async (id, author) => { const n = hints.length; hints = hints.filter((x) => !(x.id === id && x.author === author)); return n - hints.length; },
  };
}
const env = { MINIAPP_KEY_SECRET: secret, ASSETS: { fetch: async (r) => new Response("asset:" + new URL(r.url).pathname) } };
const mk = (clock = () => now) => { const s = mem(); return createHandler({ roster, now: clock, store: () => s }); };
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
  assert.deepEqual((await me(h, tom)).me.about, { gift: "fly fishing", book: "sea stories", details: {}, updated: now });
  assert.deepEqual(personIn(await me(h, anne), "tom").about, { gift: "fly fishing", book: "sea stories", details: {}, updated: now });
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

// ── What's new: timestamps the page compares against its last visit ───────────

test("/me carries server time and when each hint and about last changed", async () => {
  let t = now;
  const h = mk(() => t); const eric = await session(h, "eric"); const anne = await session(h, "anne");
  await api(h, eric, "/hints", "POST", { subject: "tom", text: "reel" });
  t = now + 50;
  await api(h, (await session(h, "tom")), "/about", "PUT", { person: "tom", gift: "fly fishing", book: "" });
  t = now + 100;
  const view = await me(h, anne);
  assert.equal(view.now, now + 100);
  assert.equal(personIn(view, "tom").hints[0].updated, now);
  assert.equal(personIn(view, "tom").about.updated, now + 50);
  assert.equal(personIn(view, "luisa").about.updated, 0, "nobody has written it yet");
});

test("editing a hint moves its time; another author's hint keeps its own", async () => {
  let t = now;
  const h = mk(() => t); const eric = await session(h, "eric"); const rob = await session(h, "rob"); const anne = await session(h, "anne");
  const { id } = await (await api(h, eric, "/hints", "POST", { subject: "tom", text: "reel" })).json();
  await api(h, rob, "/hints", "POST", { subject: "tom", text: "waders" });
  t = now + 60;
  await api(h, eric, `/hints/${id}`, "PUT", { text: "a better reel" });
  const hints = personIn(await me(h, anne), "tom").hints;
  assert.deepEqual(hints.map((x) => [x.text, x.updated]), [["a better reel", now + 60], ["waders", now]]);
});

test("timestamps give the subject no trace of hints about them", async () => {
  let t = now;
  const h = mk(() => t); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  t = now + 777;
  await api(h, eric, "/hints", "POST", { subject: "tom", text: "reel" });
  const tomView = await me(h, tom);
  // Only the server clock may carry that second; nothing about any person can.
  assert.equal(tomView.now, now + 777);
  assert.ok(!JSON.stringify({ me: tomView.me, people: tomView.people }).includes(String(now + 777)));
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

// ── Sizes and favourites ─────────────────────────────────────────────────────

test("sizes are read by everybody, like the rest of what you write about yourself", async () => {
  const h = mk(); const tom = await session(h, "tom"); const anne = await session(h, "anne");
  const res = await api(h, tom, "/about", "PUT", { person: "tom", gift: "", book: "", details: { top: " L ", shoes: "US 11", avoid: "no nuts" } });
  assert.equal(res.status, 200);
  const want = { top: "L", shoes: "US 11", avoid: "no nuts" };
  assert.deepEqual((await me(h, tom)).me.about.details, want);
  assert.deepEqual(personIn(await me(h, anne), "tom").about.details, want);
});

test("a blank size is dropped, so clearing one is the same as never filling it in", async () => {
  const h = mk(); const tom = await session(h, "tom");
  await api(h, tom, "/about", "PUT", { person: "tom", gift: "", book: "", details: { top: "L", pants: "32" } });
  await api(h, tom, "/about", "PUT", { person: "tom", gift: "", book: "", details: { top: "L", pants: "   " } });
  assert.deepEqual((await me(h, tom)).me.about.details, { top: "L" });
});

test("a page that sends no sizes keeps the ones already saved", async () => {
  const h = mk(); const tom = await session(h, "tom");
  await api(h, tom, "/about", "PUT", { person: "tom", gift: "a", book: "", details: { shoes: "US 11" } });
  // An older copy of the page, open in a tab from before sizes existed.
  assert.equal((await api(h, tom, "/about", "PUT", { person: "tom", gift: "b", book: "" })).status, 200);
  const about = (await me(h, tom)).me.about;
  assert.equal(about.gift, "b");
  assert.deepEqual(about.details, { shoes: "US 11" });
});

test("a parent fills in a kid's sizes; nobody else can", async () => {
  const h = mk(); const tom = await session(h, "tom"); const eric = await session(h, "eric");
  assert.equal((await api(h, tom, "/about", "PUT", { person: "margot", gift: "", book: "", details: { shoes: "kids 13" } })).status, 200);
  assert.equal((await api(h, eric, "/about", "PUT", { person: "margot", gift: "", book: "", details: { shoes: "kids 2" } })).status, 403);
  assert.deepEqual(personIn(await me(h, eric), "margot").about.details, { shoes: "kids 13" });
});

test("sizes refuse unknown fields, non-strings, runaway text and non-objects", async () => {
  const h = mk(); const tom = await session(h, "tom");
  const put = (details) => api(h, tom, "/about", "PUT", { person: "tom", gift: "", book: "", details });
  for (const d of [{ hat: "7" }, { top: 12 }, { top: "x".repeat(MAX_DETAIL + 1) }, ["L"], "L", null, { __proto__: null, constructor: "x" }]) {
    assert.equal((await put(d)).status, 400, JSON.stringify(d));
  }
  assert.equal((await put({ top: "x".repeat(MAX_DETAIL) })).status, 200);
  // Nothing refused above was stored.
  assert.deepEqual(Object.keys((await me(h, tom)).me.about.details), ["top"]);
});

test("/me hands the page the field list it draws the form from", async () => {
  const h = mk(); const tom = await session(h, "tom");
  const view = await me(h, tom);
  assert.deepEqual(view.detailFields.map((f) => f.key), DETAIL_FIELDS.map((f) => f.key));
  assert.deepEqual(personIn(view, "luisa").about.details, {}, "nobody has written it yet");
});

test("a stored column is read defensively", () => {
  assert.deepEqual(readDetails('{"top":"M","bogus":"x","shoes":7,"pants":"  "}'), { top: "M" });
  assert.deepEqual(readDetails("not json"), {});
  assert.deepEqual(readDetails('["M"]'), {});
  assert.deepEqual(readDetails(null), {});
});

test("every field has a unique key, a group the page knows, and a label", () => {
  assert.equal(new Set(DETAIL_FIELDS.map((f) => f.key)).size, DETAIL_FIELDS.length);
  for (const f of DETAIL_FIELDS) {
    assert.ok(["sizes", "likes"].includes(f.group), f.key);
    assert.ok(f.label && f.placeholder, f.key);
  }
});

// ── A couple's book ──────────────────────────────────────────────────────────

test("a book for either partner is the couple's one book", async () => {
  const h = mk(); const eric = await session(h, "eric");
  assert.equal((await api(h, eric, "/assignment", "PUT", { gifts: ["anne"], book: "anne" })).status, 200);
  // Gifts stay separate; the book is stored and read back as the couple.
  assert.deepEqual((await me(h, eric)).assignment, { gifts: ["anne"], book: "rob" });
  assert.deepEqual((await me(h, eric)).bookCouples, [["rob", "anne"]]);
});

test("neither partner can be given their own couple's book", async () => {
  const h = mk(); const rob = await session(h, "rob"); const anne = await session(h, "anne");
  assert.equal((await api(h, rob, "/assignment", "PUT", { gifts: [], book: "anne" })).status, 400);
  assert.equal((await api(h, anne, "/assignment", "PUT", { gifts: [], book: "rob" })).status, 400);
  // ...including when the organizer sets it for them.
  assert.equal((await api(h, anne, "/assignments/rob", "PUT", { gifts: [], book: "anne" })).status, 400);
  // A gift to your partner is still fine.
  assert.equal((await api(h, rob, "/assignment", "PUT", { gifts: ["anne"], book: "tom" })).status, 200);
});

test("a book stored against the second partner reads as the couple", async () => {
  // Rows written before couples existed name whichever partner was ticked — Jack's live row says "laura".
  const store = mem();
  const h = createHandler({ roster, now: () => now, store: () => store });
  await store.setAssignment("tom", [{ receiver: "anne", kind: "book" }]);
  await store.setAssignment("eric", [{ receiver: "rob", kind: "book" }]);
  assert.equal((await me(h, await session(h, "tom"))).assignment.book, "rob");
  const view = await (await api(h, await session(h, "anne"), "/assignments")).json();
  assert.deepEqual(view.givers.filter((g) => g.book).map((g) => [g.id, g.book]), [["eric", "rob"], ["tom", "rob"]]);
  // And the two find each other as collaborators.
  assert.deepEqual((await me(h, await session(h, "eric"))).collaborators.map((c) => c.givers.map((g) => g.name)), [["TOM"]]);
});

// ── Bought ───────────────────────────────────────────────────────────────────

test("ticking somebody off is yours alone", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom"); const luisa = await session(h, "luisa");
  await api(h, eric, "/assignment", "PUT", { gifts: ["tom"], book: null });
  assert.equal((await api(h, eric, "/bought", "PUT", { person: "tom", kind: "gift", bought: true })).status, 200);
  assert.deepEqual((await me(h, eric)).bought, [{ person: "tom", kind: "gift" }]);
  assert.deepEqual((await me(h, luisa)).bought, []);
  // The person it's for sees no trace of it anywhere.
  assert.ok(!JSON.stringify(await me(h, tom)).includes('"bought":true'));
  assert.deepEqual((await me(h, tom)).bought, []);
  assert.equal((await api(h, eric, "/bought", "PUT", { person: "tom", kind: "gift", bought: false })).status, 200);
  assert.deepEqual((await me(h, eric)).bought, []);
});

test("a couple's book is one tick, whichever partner it's ticked against", async () => {
  const h = mk(); const eric = await session(h, "eric");
  await api(h, eric, "/bought", "PUT", { person: "anne", kind: "book", bought: true });
  assert.deepEqual((await me(h, eric)).bought, [{ person: "rob", kind: "book" }]);
  await api(h, eric, "/bought", "PUT", { person: "rob", kind: "book", bought: false });
  assert.deepEqual((await me(h, eric)).bought, []);
});

test("you can tick off a kid's gift, but not yourself, a kid's book, or your own couple's book", async () => {
  const h = mk(); const eric = await session(h, "eric"); const rob = await session(h, "rob");
  assert.equal((await api(h, eric, "/bought", "PUT", { person: "margot", kind: "gift", bought: true })).status, 200);
  for (const [who, body] of [[eric, { person: "eric", kind: "gift", bought: true }], [eric, { person: "margot", kind: "book", bought: true }],
    [rob, { person: "anne", kind: "book", bought: true }], [eric, { person: "nobody", kind: "gift", bought: true }],
    [eric, { person: "tom", kind: "socks", bought: true }], [eric, { person: "tom", kind: "gift", bought: "yes" }]]) {
    assert.equal((await api(h, who, "/bought", "PUT", body)).status, 400, JSON.stringify(body));
  }
});

// ── Collaborators ────────────────────────────────────────────────────────────

test("you see who else has your person, and whether they've got it", async () => {
  const h = mk(); const eric = await session(h, "eric"); const luisa = await session(h, "luisa"); const anne = await session(h, "anne");
  await api(h, eric, "/assignment", "PUT", { gifts: ["tom"], book: null });
  await api(h, luisa, "/assignment", "PUT", { gifts: ["tom"], book: null });
  await api(h, luisa, "/bought", "PUT", { person: "tom", kind: "gift", bought: true });
  assert.deepEqual((await me(h, eric)).collaborators, [{ person: "tom", kind: "gift", givers: [{ name: "LUISA", bought: true }] }]);
  assert.deepEqual((await me(h, luisa)).collaborators, [{ person: "tom", kind: "gift", givers: [{ name: "ERIC", bought: false }] }]);
  // Somebody who doesn't have Tom learns nothing about who does.
  assert.deepEqual((await me(h, anne)).collaborators, []);
});

test("collaborators are per kind: a gift-giver and a book-giver for one person aren't paired", async () => {
  const h = mk(); const eric = await session(h, "eric"); const luisa = await session(h, "luisa");
  await api(h, eric, "/assignment", "PUT", { gifts: ["tom"], book: null });
  await api(h, luisa, "/assignment", "PUT", { gifts: [], book: "tom" });
  assert.deepEqual((await me(h, eric)).collaborators, []);
});

test("two givers of a couple's book find each other whichever partner each ticked", async () => {
  const h = mk(); const eric = await session(h, "eric"); const tom = await session(h, "tom");
  await api(h, eric, "/assignment", "PUT", { gifts: [], book: "rob" });
  await api(h, tom, "/assignment", "PUT", { gifts: [], book: "anne" });
  assert.deepEqual((await me(h, eric)).collaborators, [{ person: "rob", kind: "book", givers: [{ name: "TOM", bought: false }] }]);
});

test("a collaborator never learns your other people", async () => {
  const h = mk(); const eric = await session(h, "eric"); const luisa = await session(h, "luisa");
  await api(h, eric, "/assignment", "PUT", { gifts: ["tom", "anne"], book: null });
  await api(h, luisa, "/assignment", "PUT", { gifts: ["tom"], book: null });
  const c = (await me(h, luisa)).collaborators;
  assert.deepEqual(c.map((x) => x.person), ["tom"]);
  assert.ok(!JSON.stringify(c).includes("anne"));
});

test("the survey module is served behind the gate, and nothing else under /ss is", async () => {
  const h = mk(); const tom = await session(h, "tom");
  assert.equal((await h(req("/ss/survey.js"), env)).status, 403);
  const res = await h(req("/ss/survey.js", { headers: { Cookie: tom } }), env);
  assert.equal(await res.text(), "asset:/ss/survey.js");
  // Any other path is still the page, not an arbitrary asset.
  assert.equal(await (await h(req("/ss/roster.js", { headers: { Cookie: tom } }), env)).text(), "asset:/ss/");
});
