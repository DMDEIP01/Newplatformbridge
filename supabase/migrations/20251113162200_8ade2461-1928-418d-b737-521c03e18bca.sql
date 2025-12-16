-- Add excess_payment_method column to claim_fulfillment table
ALTER TABLE public.claim_fulfillment 
ADD COLUMN IF NOT EXISTS excess_payment_method TEXT;