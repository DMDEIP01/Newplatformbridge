-- Add unique constraint to prevent duplicate fulfillment records per claim
ALTER TABLE claim_fulfillment 
ADD CONSTRAINT claim_fulfillment_claim_id_unique UNIQUE (claim_id);