import { test } from "node:test";
import assert from "node:assert/strict";
import * as roster from "../src/roster.js";

// The roster is hand-edited data that decides who sees what, and the Worker
// trusts it completely. These are the mistakes that would otherwise surface as
// somebody seeing the wrong page.

const adults = roster.ADULTS.map((a) => a.id);

test("ids are unique across adults and kids", () => {
  const ids = [...adults, ...roster.KIDS.map((k) => k.id)];
  assert.equal(new Set(ids).size, ids.length);
});

test("no two adults share a uid — one account must never resolve to two people", () => {
  const uids = roster.ADULTS.map((a) => a.uid);
  assert.equal(new Set(uids).size, uids.length);
});

test("every kid's parents name real adults", () => {
  for (const k of roster.KIDS) {
    assert.ok(k.parents.length, `${k.id} has nobody who can write their about`);
    for (const p of k.parents) assert.ok(adults.includes(p), `${k.id} parent ${p}`);
  }
});

test("the trip is set", () => {
  assert.ok(roster.TRIP && !roster.TRIP.startsWith("PLACEHOLDER"));
});

test("every organizer is a real adult", () => {
  for (const id of roster.ORGANIZERS) assert.ok(adults.includes(id), `organizer ${id}`);
});

test("a book couple is two different adults, and nobody is in two couples", () => {
  const seen = new Set();
  for (const c of roster.BOOK_COUPLES ?? []) {
    assert.equal(c.length, 2, JSON.stringify(c));
    assert.notEqual(c[0], c[1]);
    for (const id of c) {
      assert.ok(adults.includes(id), `couple member ${id}`);
      assert.ok(!seen.has(id), `${id} is in two couples`);
      seen.add(id);
    }
  }
});
