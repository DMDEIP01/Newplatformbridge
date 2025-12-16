-- Change repairer_id from UUID to TEXT to match the repairer IDs from program settings
ALTER TABLE public.fulfillment_assignments
ALTER COLUMN repairer_id TYPE TEXT;