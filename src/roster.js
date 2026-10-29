// Hardcoded family roster. Edit and redeploy when the family changes.
// `uid` is the person's Majestic (Firebase) uid, visible in the trip roster. Replace the PLACEHOLDERs.
// Kids are receivers only; their wishlists are edited by the adults in `parents`.

export const TRIP = "PLACEHOLDER_TRIP_ID"; // the Steamboat trip id the key must be minted for
export const ORGANIZER = "eric";

export const ADULTS = [
  { id: "rob", name: "Rob", uid: "PLACEHOLDER_rob" },
  { id: "laura", name: "Laura", uid: "PLACEHOLDER_laura" },
  { id: "luisa", name: "Luisa", uid: "PLACEHOLDER_luisa" },
  { id: "tom", name: "Tom", uid: "PLACEHOLDER_tom" },
  { id: "eric", name: "Eric", uid: "PLACEHOLDER_eric" },
  { id: "kellie", name: "Kellie", uid: "PLACEHOLDER_kellie" },
  { id: "anne", name: "Anne", uid: "PLACEHOLDER_anne" },
  { id: "robbie", name: "Robbie", uid: "PLACEHOLDER_robbie" },
  { id: "barbara", name: "Barbara", uid: "PLACEHOLDER_barbara" },
  { id: "ian", name: "Ian", uid: "PLACEHOLDER_ian" },
  { id: "jack", name: "Jack", uid: "PLACEHOLDER_jack" },
];

export const KIDS = [
  { id: "margot", name: "Margot", parents: [] }, // TODO: adult ids, e.g. ["tom", "luisa"]
  { id: "elodie", name: "Elodie", parents: [] }, // TODO
];

// Pairs that must never be matched (e.g. spouses). Adult ids.
export const EXCLUDE = [];
