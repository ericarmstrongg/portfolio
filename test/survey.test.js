import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, HOBBIES, TREATS, PLENTY, CLOTHES, suggestStocking, compose, merge, MAX_STOCKING_CHOICES } from "../portfolio/ss/survey.js";
import { parseDetails, MAX_DETAIL } from "../src/details.js";

// The survey's output goes straight to PUT /about. Anything it builds that the Worker refuses is a survey
// that walks somebody through seven steps and then fails to save — so the contract is tested from both ends.

const everything = { hobbies: HOBBIES, styles: ["Surprise me", "Something cozy"], clothes: CLOTHES[0], treats: TREATS, plenty: [], wish: "x".repeat(300) };

test("whatever the answers, the details are ones the Worker accepts", () => {
  const all = { ...everything, plenty: PLENTY, clothes: CLOTHES[2], stocking: suggestStocking(everything) };
  for (const answers of [{}, everything, all, { treats: ["Nothing sweet"] }, { plenty: ["Mugs"] }]) {
    const { details, gift } = compose(answers, MAX_DETAIL);
    assert.notEqual(parseDetails(details), null, JSON.stringify(answers));
    for (const v of Object.values(details)) assert.ok(v.length <= MAX_DETAIL);
    assert.ok(gift.length <= 4000);
  }
});

test("a long pick-list is shortened to fit, never refused", () => {
  const { details } = compose({ stocking: Array.from({ length: 80 }, (_, i) => `Stocking item number ${i}`) }, 120);
  assert.ok(details.stocking.length <= 120 && details.stocking.length > 80, details.stocking);
  assert.ok(details.stocking.startsWith("Stocking item number 0, stocking item number 1, "), "keeps the first picks");
});

test("a list reads as one phrase: capital first word, the rest as written in a sentence", () => {
  const { details } = compose({ treats: ["Dark chocolate", "Beer"], stocking: ["Hand warmers", "Local craft beer"] });
  assert.equal(details.treats, "Dark chocolate, beer");
  assert.equal(details.stocking, "Hand warmers, local craft beer");
});

test("no answers write nothing", () => {
  assert.deepEqual(compose({}), { gift: "", details: {} });
});

test("the gift note says what was picked, in words", () => {
  const { gift } = compose({ hobbies: ["Skiing & snow", "Coffee"], styles: ["Something cozy", "Surprise me"], clothes: CLOTHES[1], wish: " a Yeti cooler " });
  assert.equal(gift, "I love skiing & snow, coffee.\nBest kind of gift: something cozy. Happy to be surprised.\nClothes: just basics — socks, base layers, PJs.\nI've had my eye on: a Yeti cooler");
});

test("turning down clothes and naming a pile both land in no-thanks", () => {
  assert.equal(compose({ clothes: CLOTHES[2], plenty: ["Mugs", "Candles"] }).details.avoid, "No clothes, have plenty of mugs, candles");
});

test("stocking ideas follow hobbies, then treats, then the ones that suit anybody", () => {
  const s = suggestStocking({ hobbies: ["Golf"], treats: ["Dark chocolate"] });
  assert.deepEqual(s.slice(0, 3), ["Golf balls", "Tees & ball markers", "Dark chocolate bar"]);
  assert.ok(s.includes("Gift card"));
});

test("a stocking idea never contradicts an answer", () => {
  const s = suggestStocking({ hobbies: HOBBIES, treats: TREATS, plenty: ["Socks", "Lotions & scents", "Tech gadgets", "Kitchen gadgets"], clothes: CLOTHES[2] });
  for (const bad of ["Ski socks", "Wool socks", "Fuzzy socks", "Team beanie", "Lip balm", "SPF lip balm", "Book light", "Charging cable", "Microplane", "Wine stopper"]) {
    assert.ok(!s.includes(bad), bad);
  }
  // Without those answers the same ideas are offered.
  assert.ok(suggestStocking({ hobbies: ["Skiing & snow"] }).includes("Ski socks"));
});

test("stocking ideas are capped and never repeat", () => {
  const s = suggestStocking({ hobbies: HOBBIES, treats: TREATS });
  assert.equal(s.length, MAX_STOCKING_CHOICES);
  assert.equal(new Set(s).size, s.length);
  // Coffee is both a hobby and a treat; it's offered once.
  assert.equal(suggestStocking({ hobbies: ["Coffee"], treats: ["Coffee beans"] }).filter((x) => x === "Whole-bean coffee").length, 1);
});

test("merging never throws away what somebody typed", () => {
  assert.equal(merge("", "L", "; ", 50), "L");
  assert.equal(merge("hand warmers", "hand warmers", "; ", 50), "hand warmers");
  assert.equal(merge("I love skiing.\nNo mugs.", "No mugs.", "\n\n", 50), "I love skiing.\nNo mugs.", "already in there");
  assert.equal(merge("nut allergy", "no clothes", "; ", 50), "nut allergy; no clothes");
  assert.equal(merge("x".repeat(45), "no clothes", "; ", 50), "x".repeat(45), "too long to add: keep theirs");
  assert.equal(merge("mine", "", "; ", 50), "mine");
});

test("every step is answerable", () => {
  assert.deepEqual(STEPS.map((s) => s.id), ["hobbies", "styles", "clothes", "treats", "plenty", "stocking", "wish"]);
  for (const s of STEPS) assert.ok(s.text || (typeof s.options === "function" ? s.options({}).length : s.options.length), s.id);
});
