import { verifyKey } from "./lib/miniappkey.js";
import { draw } from "./lib/draw.js";
import * as realRoster from "./roster.js";

const APP = "ss";
const COOKIE = "__Host-ms_ss";
const MAX_LIST = 4000;

const SEC = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

const denied = () => new Response("no permission", { status: 403, headers: { ...SEC, "Content-Type": "text/plain" } });
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...SEC, "Content-Type": "application/json" } });

function readCookie(req, name) {
  for (const part of (req.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/** D1-backed store. Roster membership is never stored; only wishlists and the draw. */
export function d1Store(db) {
  return {
    async getWishlists() {
      const { results } = await db.prepare("SELECT person_id, text FROM wishlists").all();
      return Object.fromEntries(results.map((r) => [r.person_id, r.text]));
    },
    async setWishlist(id, text, now) {
      await db
        .prepare("INSERT INTO wishlists (person_id, text, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(person_id) DO UPDATE SET text = ?2, updated_at = ?3")
        .bind(id, text, now)
        .run();
    },
    async getAssignments() {
      const { results } = await db.prepare("SELECT giver_id, receiver_id FROM assignments").all();
      return results.map((r) => ({ giver: r.giver_id, receiver: r.receiver_id }));
    },
    async saveDraw(rows) {
      // PRIMARY KEY(receiver_id) plus the batch makes a concurrent second draw fail rather than overwrite.
      await db.batch(rows.map((r) => db.prepare("INSERT INTO assignments (giver_id, receiver_id) VALUES (?1, ?2)").bind(r.giver, r.receiver)));
    },
  };
}

export function createHandler({ roster = realRoster, now = () => Math.floor(Date.now() / 1000), store = (env) => d1Store(env.DB) } = {}) {
  const people = (id) => roster.ADULTS.find((a) => a.id === id) || roster.KIDS.find((k) => k.id === id);

  return async function fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/ss" && !url.pathname.startsWith("/ss/")) return env.ASSETS.fetch(request);

    const t = now();
    const verify = (k) => verifyKey(k, { secret: env.MINIAPP_KEY_SECRET, app: APP, now: t });

    // 1. Exchange ?k= for a cookie, then drop it from the URL.
    if (url.searchParams.has("k")) {
      const k = url.searchParams.get("k");
      const claims = await verify(k);
      if (!claims || claims.trip !== roster.TRIP) return denied();
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
    if (!claims || claims.trip !== roster.TRIP) return denied();
    const me = roster.ADULTS.find((a) => a.uid === claims.uid);
    if (!me) return denied();

    if (!url.pathname.startsWith("/ss/api/")) {
      if (request.method !== "GET" && request.method !== "HEAD") return denied();
      return withSec(await env.ASSETS.fetch(new Request(new URL("/ss/", url), { method: "GET" })));
    }

    const db = store(env);
    const route = url.pathname.slice("/ss/api".length);

    if (request.method !== "GET") {
      // Cookie auth + state change: require JSON (forces a CORS preflight) and a same-origin Origin if present.
      const origin = request.headers.get("Origin");
      if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return json({ error: "bad request" }, 400);
      if (origin && origin !== url.origin) return denied();
    }

    if (route === "/me" && request.method === "GET") {
      const [lists, assigns] = await Promise.all([db.getWishlists(), db.getAssignments()]);
      const view = (id) => ({ id, name: people(id).name, wishlist: lists[id] || "" });
      return json({
        me: view(me.id),
        isOrganizer: me.id === roster.ORGANIZER,
        kids: roster.KIDS.filter((k) => k.parents.includes(me.id)).map((k) => view(k.id)),
        drawn: assigns.length > 0,
        // Only this caller's own giver rows; there is deliberately no way to list anyone else's.
        assignments: assigns.filter((a) => a.giver === me.id).map((a) => view(a.receiver)),
      });
    }

    if (route === "/wishlist" && request.method === "PUT") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
      const target = body && body.person;
      const text = body && body.text;
      if (typeof target !== "string" || typeof text !== "string" || text.length > MAX_LIST) return json({ error: "bad request" }, 400);
      const kid = roster.KIDS.find((k) => k.id === target);
      const allowed = target === me.id || (kid && kid.parents.includes(me.id));
      if (!allowed) return denied();
      await db.setWishlist(target, text, t);
      return json({ ok: true });
    }

    if (route === "/draw" && request.method === "POST") {
      if (me.id !== roster.ORGANIZER) return denied();
      if ((await db.getAssignments()).length) return json({ error: "already drawn" }, 409);
      let rows;
      try { rows = draw({ adults: roster.ADULTS, kids: roster.KIDS, exclude: roster.EXCLUDE }); }
      catch { return json({ error: "draw failed" }, 500); }
      try { await db.saveDraw(rows); } catch { return json({ error: "already drawn" }, 409); }
      return json({ ok: true }); // intentionally returns no assignments
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
