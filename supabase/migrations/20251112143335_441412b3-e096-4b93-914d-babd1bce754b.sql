-- Ensure complaint_reference auto-generates on insert
ALTER TABLE complaints
ALTER COLUMN complaint_reference SET DEFAULT generate_complaint_reference();