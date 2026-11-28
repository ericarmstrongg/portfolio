// The 90-second survey: a few taps instead of a blank box, ending in stocking stuffers picked from what you
// said you like. It writes nothing of its own — `compose` turns answers into the same gift note and "Good to
// know" fields the About me form already has, and the page saves them through the one route it always uses.
//
// No model, no network: every suggestion below is a fixed list, so it costs nothing, works offline once the
// page has loaded, and says the same thing to everyone who gives the same answers.

export const HOBBIES = [
  "Skiing & snow", "Hiking & outdoors", "Cooking & baking", "Coffee", "Tea", "Reading", "Fitness", "Golf",
  "Fishing", "Gardening", "Music", "Games & puzzles", "Travel", "Crafts & DIY", "Tech & gadgets",
  "Watching sports", "Art & drawing", "Photography", "Pets",
];

export const STYLES = [
  "Something useful I'll use every day", "Something cozy", "An experience or outing", "A treat to eat or drink",
  "Something for my hobby", "Something fun or silly", "Surprise me",
];

export const CLOTHES = ["Yes, love them", "Just basics — socks, base layers, PJs", "No clothes, please"];

export const TREATS = [
  "Dark chocolate", "Milk chocolate", "Candy", "Salty snacks", "Baked goods", "Coffee beans", "Tea",
  "Wine", "Beer", "Spirits", "Nothing sweet",
];

export const PLENTY = [
  "Mugs", "Candles", "Socks", "Books", "Kitchen gadgets", "Décor", "Lotions & scents", "Water bottles", "Tech gadgets",
];

// Each suggestion names what would make it unwelcome: a "plenty of" answer, or turning down clothes.
const S = (item, ...unless) => ({ item, unless });
const BY_HOBBY = {
  "Skiing & snow": [S("Hand warmers"), S("SPF lip balm", "Lotions & scents"), S("Ski socks", "Socks", "clothes"), S("Goggle wipes")],
  "Hiking & outdoors": [S("Trail snacks"), S("Headlamp", "Tech gadgets"), S("Wool socks", "Socks", "clothes"), S("Carabiner")],
  "Cooking & baking": [S("Fancy finishing salt"), S("Spice blend"), S("Good olive oil"), S("Microplane", "Kitchen gadgets")],
  "Coffee": [S("Whole-bean coffee"), S("Pour-over filters")],
  "Tea": [S("Loose-leaf tea"), S("Honey sticks")],
  "Reading": [S("Bookmark"), S("Book light", "Tech gadgets"), S("Bookshop gift card")],
  "Fitness": [S("Electrolyte packets"), S("Massage ball"), S("Resistance band")],
  "Golf": [S("Golf balls"), S("Tees & ball markers")],
  "Fishing": [S("Flies or lures"), S("Line nippers")],
  "Gardening": [S("Seed packets"), S("Garden gloves")],
  "Music": [S("Guitar picks"), S("Concert gift card")],
  "Games & puzzles": [S("Deck of cards"), S("Pocket puzzle"), S("Travel game")],
  "Travel": [S("Packing cubes"), S("Luggage tag"), S("Travel-size toiletries", "Lotions & scents")],
  "Crafts & DIY": [S("Nice pens"), S("Washi tape"), S("Mini multi-tool")],
  "Tech & gadgets": [S("Charging cable", "Tech gadgets"), S("Phone stand", "Tech gadgets")],
  "Watching sports": [S("Team beanie", "clothes"), S("Team socks", "Socks", "clothes")],
  "Art & drawing": [S("Sketchbook"), S("Fine-liner pens")],
  "Photography": [S("Lens cloth"), S("Mini tripod")],
  "Pets": [S("Treats for the pet"), S("Pet toy")],
};
const BY_TREAT = {
  "Dark chocolate": [S("Dark chocolate bar")],
  "Milk chocolate": [S("Chocolate coins")],
  "Candy": [S("Favorite candy")],
  "Salty snacks": [S("Jerky"), S("Fancy nuts")],
  "Baked goods": [S("Homemade cookies")],
  "Coffee beans": [S("Whole-bean coffee")],
  "Tea": [S("Loose-leaf tea")],
  "Wine": [S("Mini bottle of wine"), S("Wine stopper", "Kitchen gadgets")],
  "Beer": [S("Local craft beer"), S("Bottle opener", "Kitchen gadgets")],
  "Spirits": [S("Mini bottles of spirits"), S("Big-cube ice mold", "Kitchen gadgets")],
};
const ALWAYS = [S("Fuzzy socks", "Socks", "clothes"), S("Lip balm", "Lotions & scents"), S("Scratch-off lottery ticket"), S("Gift card")];

export const MAX_STOCKING_CHOICES = 14;

/** Stocking stuffers for these answers: hobbies first, then treats, then a few that suit anybody. */
export function suggestStocking({ hobbies = [], treats = [], plenty = [], clothes = null } = {}) {
  const noClothes = clothes === CLOTHES[2];
  const ok = (s) => !s.unless.some((u) => (u === "clothes" ? noClothes : plenty.includes(u)));
  const out = [];
  for (const s of [...hobbies.flatMap((h) => BY_HOBBY[h] ?? []), ...treats.flatMap((t) => BY_TREAT[t] ?? []), ...ALWAYS]) {
    if (ok(s) && !out.includes(s.item)) out.push(s.item);
  }
  return out.slice(0, MAX_STOCKING_CHOICES);
}

/** The steps, in order. `options` may be a function of the answers so far — the stocking step is. */
export const STEPS = [
  { id: "hobbies", title: "What do you love doing?", hint: "Pick as many as you like.", multi: true, options: HOBBIES },
  { id: "styles", title: "What kind of gift makes you happiest?", hint: "Pick any.", multi: true, options: STYLES },
  { id: "clothes", title: "Clothes as gifts?", multi: false, options: CLOTHES },
  { id: "treats", title: "Favorite treats?", hint: "Pick any.", multi: true, options: TREATS },
  { id: "plenty", title: "You already have plenty of…", hint: "So nobody adds to the pile.", multi: true, options: PLENTY },
  { id: "stocking", title: "Stocking stuffers you'd like", hint: "Picked from your answers. Tap the ones you'd be happy to find.", multi: true, options: suggestStocking },
  { id: "wish", title: "Anything you've had your eye on?", hint: "Optional — a thing, a shop, a link.", text: true },
];

const sentence = (lead, items) => (items.length ? `${lead} ${items.map((x) => x.toLowerCase()).join(", ")}.` : "");
/**
 * "Hand warmers, dark chocolate bar, local craft beer" — read as one phrase, so only its first word is
 * capitalised, and trimmed from the end until it fits: a long pick-list is shortened rather than refused.
 */
function fit(items, max) {
  const list = items.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x.charAt(0).toUpperCase() + x.slice(1)));
  while (list.length && list.join(", ").length > max) list.pop();
  return list.join(", ");
}

/**
 * Answers → what goes in the form. `gift` is a few plain sentences in the gift-ideas box; `details` only ever
 * names fields the Worker accepts, each within `max`. Empty answers produce nothing rather than a hollow line.
 */
export function compose(a, max = 400) {
  const clothesLine = a.clothes === CLOTHES[0] ? "Clothes are welcome." : a.clothes === CLOTHES[1] ? "Clothes: just basics — socks, base layers, PJs." : "";
  const gift = [
    sentence("I love", a.hobbies ?? []),
    sentence("Best kind of gift:", (a.styles ?? []).filter((s) => s !== "Surprise me")) + ((a.styles ?? []).includes("Surprise me") ? " Happy to be surprised." : ""),
    clothesLine,
    (a.wish ?? "").trim() ? `I've had my eye on: ${a.wish.trim()}` : "",
  ].map((l) => l.trim()).filter(Boolean).join("\n");

  const avoid = [
    ...(a.clothes === CLOTHES[2] ? ["no clothes"] : []),
    ...((a.plenty ?? []).length ? [`have plenty of ${(a.plenty ?? []).map((x) => x.toLowerCase()).join(", ")}`] : []),
  ];
  const treats = (a.treats ?? []).filter((t) => t !== "Nothing sweet");
  const details = {
    ...(treats.length || (a.treats ?? []).includes("Nothing sweet")
      ? { treats: fit([...treats, ...((a.treats ?? []).includes("Nothing sweet") ? ["nothing sweet"] : [])], max) } : {}),
    ...(avoid.length ? { avoid: fit(avoid, max) } : {}),
    ...((a.stocking ?? []).length ? { stocking: fit(a.stocking, max) } : {}),
  };
  return { gift: gift.slice(0, 4000), details };
}

/**
 * Folds a new answer into what's already in a field: empty takes it, identical keeps it, anything else is
 * kept and the new answer added after it — the survey never overwrites what somebody typed by hand.
 */
export function merge(existing, incoming, sep, max) {
  const e = (existing ?? "").trim(), n = (incoming ?? "").trim();
  if (!n || e === n || e.includes(n)) return e;
  if (!e) return n.slice(0, max);
  const joined = `${e}${sep}${n}`;
  return joined.length <= max ? joined : e;
}
