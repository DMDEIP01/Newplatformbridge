-- Fix the foreign key constraint for claim_fulfillment.repairer_id
-- It should reference repairers table, not users table

-- Drop the incorrect foreign key constraint
ALTER TABLE claim_fulfillment 
DROP CONSTRAINT IF EXISTS claim_fulfillment_repairer_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE claim_fulfillment 
ADD CONSTRAINT claim_fulfillment_repairer_id_fkey 
FOREIGN KEY (repairer_id) 
REFERENCES repairers(id) 
ON DELETE SET NULL;