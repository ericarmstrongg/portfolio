-- Anne makes the assignments and texts them out; the site no longer draws.
-- Both 0001 tables were created on 2026-11-20 and never written to, so they
-- are replaced rather than migrated.

DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS wishlists;

-- Each person types in their own assignment. Readable by the giver only.
-- `kind` is 'gift' (usually two — a couple counts as one) or 'book' (exactly one).
CREATE TABLE assignments (
  giver_id    TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('gift', 'book')),
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (giver_id, kind, receiver_id)
);

-- What you tell people about yourself. Readable by everyone.
CREATE TABLE about (
  person_id  TEXT PRIMARY KEY,
  gift       TEXT NOT NULL DEFAULT '',
  book       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

-- Notes somebody writes about somebody else. Readable by everyone except the subject.
CREATE TABLE hints (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id TEXT NOT NULL,
  author_id  TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX hints_subject ON hints (subject_id);
