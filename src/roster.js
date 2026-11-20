// Hardcoded family roster. Edit and redeploy when the family changes.
//
// `uid` is the person's Majestic (Firebase) uid in **prod**. Only fill one in once you are certain whose it is:
// a wrong uid shows that person somebody else's assignment and the hints written about them, which is the one
// failure this page exists to prevent. A PLACEHOLDER can't match any real account, so leaving one in only means
// that person gets "no permission" — they still appear as somebody you can buy for and write hints about.
//
// Kids have no accounts. Their "about" is written by the adults in `parents`, and they are never anybody's
// assignment: gifts and books for them are welcome but optional.

export const TRIP = "SgAs5X6noG0zjU8Z8jrK"; // "Steamboat Xmas ‘26" in prod (majestic-c3bcc). Everyone must be a member of it.

export const ADULTS = [
  { id: "rob", name: "Rob", uid: "lDbk1W7DEcb1gJGuNfTedvW3o202" }, // rob.strong.arm@
  { id: "laura", name: "Laura", uid: "XhcOE9z3WmVSnuss0MbnjNJkAKc2" }, // laura.armstrong725@
  { id: "anne", name: "Anne", uid: "zJ5D38iXMrZmrYG3UAsaxXlkc8C3" }, // aarmstrong68@
  { id: "robbie", name: "Robbie", uid: "kCXQIHM8kndX56vjjVbm3Wuw1ut2" }, // rw3.armstrong@
  { id: "eric", name: "Eric", uid: "TdFJw5tW50QVLGrjIwLRuXpyq6Z2" }, // eric.armstrongg@
  { id: "kj", name: "KJ", uid: "NxpWlJSJYpccpxyQwCm4RYJAwHh2" }, // kelliejoy@
  { id: "luisa", name: "Luisa", uid: "gMhNN0ukeUgo6woyhfQOgGRUr922" }, // mlarmstrong22@
  { id: "tom", name: "Tom", uid: "8kglVNp82tRZEGnEshOe9bMzhSj2" }, // lapinski.thomas@
  { id: "jack", name: "Jack", uid: "P5bZes57y2Ut8Bzn5uNIRYEhVfv2" }, // jca.armstrong@
  { id: "ian", name: "Ian", uid: "PLACEHOLDER_ian" }, // TODO: email to come
  { id: "barbara", name: "Barbara", uid: "PLACEHOLDER_barbara" }, // no Majestic account in prod yet
];

// Anne makes the assignments every year. An organizer can read and set **anybody's** assignment, so this
// list is the people who already know them all — adding somebody here tells them every pairing. It grants
// nothing else: hints about an organizer stay hidden from them like anyone's.
export const ORGANIZERS = ["anne"];

export const KIDS = [
  { id: "margot", name: "Margot", parents: ["luisa", "tom"] },
  { id: "elodie", name: "Elodie", parents: ["luisa", "tom"] },
];

// Anne's assignments are two gifts and one book. A couple counts as one gift ("Mom & Dad"), so the gift
// limit is generous; it only exists to stop a runaway request.
export const MAX_GIFTS = 6;
