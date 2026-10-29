CREATE TABLE wishlists (
  person_id  TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE assignments (
  giver_id    TEXT NOT NULL,
  receiver_id TEXT NOT NULL PRIMARY KEY
);
