-- Sizes and favourites: the short facts a gift needs that nobody types into a paragraph.
-- A JSON object keyed by the field names in `DETAIL_FIELDS` (src/details.js). Additive: every existing
-- row reads as '{}', which is "nothing filled in", so nothing about the gift and book notes changes.
ALTER TABLE about ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
