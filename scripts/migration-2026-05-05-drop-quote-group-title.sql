-- Drop denormalized quote_group_title column from estimate_lines.
-- Group titles are now resolved via the quote_groups table relation.
-- Run only after the frontend has been updated to use quote_groups API endpoints.

ALTER TABLE estimate_lines DROP COLUMN quote_group_title;