import { verifyKey } from "./lib/miniappkey.js";
import * as realRoster from "./roster.js";
import { DENIED_HTML } from "./denied.js";

const APP = "ss";
const COOKIE = "__Host-ms_ss";
const MAX_ABOUT = 4000;
const MAX_HINT = 2000;

const SEC = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

// A person who opened the page gets an explanation; a script calling the API gets a status. Neither says why.
const deniedPage = () => new Response(DENIED_HTML, { status: 403, headers: { ...SEC, "Content-Type": "text/html; charset=utf-8" } });
const denied = () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...SEC, "Content-Type": "application/json" } });
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...SEC, "Content-Type": "application/json" } });
const bad = () => json({ error: "bad request" }, 400);

function readCookie(req, name) {
  for (const part of (req.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/**
 * D1-backed store. Roster membership is never stored — `roster.js` is the only list of people.
 *
 * The store returns rows unfiltered; **who may see what is decided in the handler**, in one place, where the
 * tests can reach it. Two rules carry the whole page: an assignment is read by its giver only, and a hint is
 * read by everybody except its subject.
 */
export function d1Store(db) {
  return {
    async getAbout() {
      const { results } = await db.prepare("SELECT person_id, gift, book FROM about").all();
      return Object.fromEntries(results.map((r) => [r.person_id, { gift: r.gift, book: r.book }]));
    },
    async setAbout(id, gift, book, now) {
      await db
        .prepare("INSERT INTO about (person_id, gift, book, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(person_id) DO UPDATE SET gift = ?2, book = ?3, updated_at = ?4")
        .bind(id, gift, book, now)
        .run();
    },
    async getAssignment(giver) {
      const { results } = await db.prepare("SELECT receiver_id, kind FROM assignments WHERE giver_id = ?1").bind(giver).all();
      return results.map((r) => ({ receiver: r.receiver_id, kind: r.kind }));
    },
    async getAllAssignments() {
      const { results } = await db.prepare("SELECT giver_id, receiver_id, kind FROM assignments").all();
      return results.map((r) => ({ giver: r.giver_id, receiver: r.receiver_id, kind: r.kind }));
    },
    async setAssignment(giver, rows, now) {
      // One batch is one transaction: the old assignment is never half-replaced.
      await db.batch([
        db.prepare("DELETE FROM assignments WHERE giver_id = ?1").bind(giver),
        ...rows.map((r) => db.prepare("INSERT INTO assignments (giver_id, receiver_id, kind, updated_at) VALUES (?1, ?2, ?3, ?4)").bind(giver, r.receiver, r.kind, now)),
      ]);
    },
    async getHints() {
      const { results } = await db.prepare("SELECT id, subject_id, author_id, text, updated_at FROM hints ORDER BY created_at, id").all();
      return results.map((r) => ({ id: r.id, subject: r.subject_id, author: r.author_id, text: r.text, updated: r.updated_at }));
    },
    async addHint(subject, author, text, now) {
      const r = await db.prepare("INSERT INTO hints (subject_id, author_id, text, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)").bind(subject, author, text, now).run();
      return r.meta.last_row_id;
    },
    async updateHint(id, author, text, now) {
      const r = await db.prepare("UPDATE hints SET text = ?3, updated_at = ?4 WHERE id = ?1 AND author_id = ?2").bind(id, author, text, now).run();
      return r.meta.changes;
    },
    async deleteHint(id, author) {
      const r = await db.prepare("DELETE FROM hints WHERE id = ?1 AND author_id = ?2").bind(id, author).run();
      return r.meta.changes;
    },
  };
}

async function readJSON(request) {
  try { return await request.json(); } catch { return null; }
}

export function createHandler({ roster = realRoster, now = () => Math.floor(Date.now() / 1000), store = (env) => d1Store(env.DB) } = {}) {
  const everyone = [...roster.ADULTS.map((a) => ({ ...a, kid: false })), ...roster.KIDS.map((k) => ({ ...k, kid: true }))];
  const person = (id) => everyone.find((p) => p.id === id);
  const isAdult = (id) => roster.ADULTS.some((a) => a.id === id);
  const maxGifts = roster.MAX_GIFTS ?? 6;
  const organizers = roster.ORGANIZERS ?? [];
  const order = (id) => everyone.findIndex((p) => p.id === id);
  const byRoster = (a, b) => order(a) - order(b);

  /** Rows for one giver, in the shape the page reads. */
  const shape = (rows) => ({
    gifts: rows.filter((a) => a.kind === "gift").map((a) => a.receiver).sort(byRoster),
    book: rows.find((a) => a.kind === "book")?.receiver ?? null,
  });

  /**
   * Validate an assignment *for a given giver* — the giver is whoever it's for, not whoever is saving it, so
   * an organizer setting Rob's can't hand Rob himself. Adults only, no repeats. Kids are nobody's assignment.
   */
  function parseAssignment(body, giver) {
    const gifts = body && body.gifts;
    const book = body ? body.book : undefined;
    if (!Array.isArray(gifts) || gifts.length > maxGifts || !(book === null || typeof book === "string")) return null;
    const ok = (id) => typeof id === "string" && id !== giver && isAdult(id);
    if (!gifts.every(ok) || new Set(gifts).size !== gifts.length || (book !== null && !ok(book))) return null;
    return [...gifts.map((receiver) => ({ receiver, kind: "gift" })), ...(book ? [{ receiver: book, kind: "book" }] : [])];
  }

  return async function fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/ss" && !url.pathname.startsWith("/ss/")) return env.ASSETS.fetch(request);

    const t = now();
    const verify = (k) => verifyKey(k, { secret: env.MINIAPP_KEY_SECRET, app: APP, now: t });
    const refuse = url.pathname.startsWith("/ss/api/") ? denied : deniedPage;

    // 1. Exchange ?k= for a cookie, then drop it from the URL.
    if (url.searchParams.has("k")) {
      const k = url.searchParams.get("k");
      const claims = await verify(k);
      if (!claims || claims.trip !== roster.TRIP) return refuse();
      url.searchParams.delete("k");
      return new Response(null, {
        status: 302,
        headers: {
          ...SEC,
          Location: url.pathname + url.search,
          "Set-Cookie": `${COOKIE}=${k}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${claims.exp - t}`,
        },
      });
    }

    // 2. Everything else needs a valid cookie for a rostered adult.
    const claims = await verify(readCookie(request, COOKIE));
    if (!claims || claims.trip !== roster.TRIP) return refuse();
    const me = roster.ADULTS.find((a) => a.uid === claims.uid);
    if (!me) return refuse();

    if (!url.pathname.startsWith("/ss/api/")) {
      if (request.method !== "GET" && request.method !== "HEAD") return refuse();
      return withSec(await env.ASSETS.fetch(new Request(new URL("/ss/", url), { method: "GET" })));
    }

    const db = store(env);
    const route = url.pathname.slice("/ss/api".length);

    if (request.method !== "GET") {
      // Cookie auth + state change: require JSON (forces a CORS preflight) and a same-origin Origin if present.
      const origin = request.headers.get("Origin");
      if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return bad();
      if (origin && origin !== url.origin) return denied();
    }

    const isOrganizer = organizers.includes(me.id);
    const canEditAbout = (id) => id === me.id || roster.KIDS.some((k) => k.id === id && k.parents.includes(me.id));

    if (route === "/me" && request.method === "GET") {
      const [about, assignment, hints] = await Promise.all([db.getAbout(), db.getAssignment(me.id), db.getHints()]);
      const aboutOf = (id) => about[id] || { gift: "", book: "" };
      return json({
        me: { id: me.id, name: me.name, about: aboutOf(me.id) },
        isOrganizer: isOrganizer,
        // Only the caller's own rows. Anybody else's are reachable only through the organizer routes below.
        assignment: shape(assignment),
        // Everybody but the caller. **Hints about the caller are never in this list** — the person they're
        // about is the one person who must not see them.
        people: everyone
          .filter((p) => p.id !== me.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            kid: p.kid,
            canEdit: canEditAbout(p.id),
            about: aboutOf(p.id),
            hints: hints
              .filter((h) => h.subject === p.id)
              .map((h) => ({ id: h.id, author: person(h.author)?.name ?? "Someone", mine: h.author === me.id, text: h.text })),
          })),
      });
    }

    if (route === "/about" && request.method === "PUT") {
      const body = await readJSON(request);
      const { person: target, gift, book } = body || {};
      if (typeof target !== "string" || typeof gift !== "string" || typeof book !== "string") return bad();
      if (gift.length > MAX_ABOUT || book.length > MAX_ABOUT) return bad();
      if (!canEditAbout(target)) return denied();
      await db.setAbout(target, gift, book, t);
      return json({ ok: true });
    }

    if (route === "/assignment" && request.method === "PUT") {
      const rows = parseAssignment(await readJSON(request), me.id);
      if (!rows) return bad();
      await db.setAssignment(me.id, rows, t);
      return json({ ok: true });
    }

    // ── Organizer: every assignment, readable and settable. Nothing else — no hints, no extra about. ──
    if (route === "/assignments" && request.method === "GET") {
      if (!isOrganizer) return denied();
      const all = await db.getAllAssignments();
      return json({
        givers: roster.ADULTS.map((a) => ({ id: a.id, name: a.name, ...shape(all.filter((r) => r.giver === a.id)) })),
      });
    }

    const giverRoute = route.match(/^\/assignments\/([a-z0-9-]{1,40})$/);
    if (giverRoute && request.method === "PUT") {
      if (!isOrganizer) return denied();
      const giver = giverRoute[1];
      if (!isAdult(giver)) return bad();
      const rows = parseAssignment(await readJSON(request), giver);
      if (!rows) return bad();
      await db.setAssignment(giver, rows, t);
      return json({ ok: true });
    }

    if (route === "/hints" && request.method === "POST") {
      const body = await readJSON(request);
      const { subject, text } = body || {};
      if (typeof subject !== "string" || typeof text !== "string" || !text.trim() || text.length > MAX_HINT) return bad();
      // Not about yourself: a hint you can write but never read back is a trap.
      if (subject === me.id || !person(subject)) return bad();
      const id = await db.addHint(subject, me.id, text.trim(), t);
      return json({ ok: true, id });
    }

    const hintRoute = route.match(/^\/hints\/(\d{1,12})$/);
    if (hintRoute && (request.method === "PUT" || request.method === "DELETE")) {
      const id = Number(hintRoute[1]);
      if (request.method === "DELETE") {
        // Author only. The same "not found" whether it doesn't exist or isn't yours.
        return (await db.deleteHint(id, me.id)) ? json({ ok: true }) : json({ error: "not found" }, 404);
      }
      const body = await readJSON(request);
      const text = body && body.text;
      if (typeof text !== "string" || !text.trim() || text.length > MAX_HINT) return bad();
      return (await db.updateHint(id, me.id, text.trim(), t)) ? json({ ok: true }) : json({ error: "not found" }, 404);
    }

    return json({ error: "not found" }, 404);
  };
}

function withSec(res) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SEC)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

const handler = createHandler();
export default { fetch: handler };
