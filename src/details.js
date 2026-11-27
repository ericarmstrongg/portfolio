// The short facts a gift-giver needs and nobody puts in a paragraph: sizes, and a handful of favourites.
//
// This list is the contract between the page and the Worker. The page draws a field per entry; the Worker
// stores only these keys and refuses any other, so a typo in one place shows up as a 400 rather than as a
// size that saves and is never shown. Adding a field is an edit here and a deploy — no migration, because
// they all live in one JSON column.
//
// Each value is free text on purpose. "M", "15½ / 34", "women's 8, men's 6½", "32 × 30 but likes it loose" are
// all real answers, and a picker that can only hold one of them is a picker people skip.

export const DETAIL_FIELDS = [
  // ── Sizes ──
  { key: "top", group: "sizes", label: "Shirt / top", placeholder: "M, or 15½ × 34", chips: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "sweater", group: "sizes", label: "Sweater / jacket", placeholder: "L", chips: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "pants", group: "sizes", label: "Pants", placeholder: "32 × 30, or 8" },
  { key: "shoes", group: "sizes", label: "Shoes", placeholder: "US 10½, or women's 8" },
  { key: "otherSizes", group: "sizes", label: "Other sizes", placeholder: "Hat, gloves, ring, dress, PJs…" },
  // ── Favourites ──
  { key: "colours", group: "likes", label: "Favourite colours", placeholder: "Navy, forest green — no orange" },
  { key: "treats", group: "likes", label: "Snacks, treats & drinks", placeholder: "Dark chocolate, IPAs, oat-milk latte" },
  { key: "brands", group: "likes", label: "Stores & brands", placeholder: "Patagonia, REI, the local bookshop" },
  { key: "avoid", group: "likes", label: "Allergies & no-thanks", placeholder: "Nut allergy, no scented candles, has enough mugs" },
];

export const MAX_DETAIL = 200;

const KEYS = new Set(DETAIL_FIELDS.map((f) => f.key));

/**
 * A request's details, or null if it's malformed. Only listed keys, only strings, each one short. Blank values
 * are dropped rather than stored, so "cleared" and "never filled in" are the same thing on the way back out.
 */
export function parseDetails(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (!KEYS.has(k) || typeof v !== "string" || v.length > MAX_DETAIL) return null;
    const t = v.trim();
    if (t) out[k] = t;
  }
  return out;
}

/** A stored column, read defensively: anything unparseable or unlisted is dropped rather than trusted. */
export function readDetails(stored) {
  let v;
  try { v = JSON.parse(stored || "{}"); } catch { return {}; }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([k, x]) => KEYS.has(k) && typeof x === "string" && x.trim()));
}
