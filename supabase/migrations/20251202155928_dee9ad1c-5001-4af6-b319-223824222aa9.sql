-- Add repairer_report column to store the report file path
ALTER TABLE public.claim_fulfillment 
ADD COLUMN IF NOT EXISTS repairer_report text[] DEFAULT NULL;