-- Add units column to repair_costs table
ALTER TABLE repair_costs ADD COLUMN units integer NOT NULL DEFAULT 1;