-- Fix RLS policies for claim_fulfillment table
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view fulfillment for their claims" ON claim_fulfillment;
DROP POLICY IF EXISTS "Consultants can manage fulfillment" ON claim_fulfillment;
DROP POLICY IF EXISTS "Claims agents can manage fulfillment" ON claim_fulfillment;
DROP POLICY IF EXISTS "Authenticated users can insert fulfillment" ON claim_fulfillment;
DROP POLICY IF EXISTS "Authenticated users can view fulfillment" ON claim_fulfillment;
DROP POLICY IF EXISTS "Authenticated users can update fulfillment" ON claim_fulfillment;
DROP POLICY IF EXISTS "System roles can delete fulfillment" ON claim_fulfillment;

-- Enable RLS
ALTER TABLE claim_fulfillment ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users to manage fulfillment
CREATE POLICY "Authenticated users can manage fulfillment"
ON claim_fulfillment
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claims
    WHERE claims.id = claim_fulfillment.claim_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM claims
    WHERE claims.id = claim_fulfillment.claim_id
  )
);