-- "I've got it": a giver's own tick against somebody they're buying for. Readable by that giver, and by
-- anybody else assigned the same person and kind (their collaborators) — never by the person it's for.
-- `receiver_id` for a book is the couple's stored id (BOOK_COUPLES), so a shared book is one tick.
CREATE TABLE bought (
  giver_id    TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('gift', 'book')),
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (giver_id, receiver_id, kind)
);
