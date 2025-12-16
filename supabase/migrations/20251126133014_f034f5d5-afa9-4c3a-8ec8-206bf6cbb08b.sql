-- Add manufacturer and model_name columns to fulfillment_assignments for device-specific assignments
ALTER TABLE fulfillment_assignments
ADD COLUMN manufacturer text,
ADD COLUMN model_name text;