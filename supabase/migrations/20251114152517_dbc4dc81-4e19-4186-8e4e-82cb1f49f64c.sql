-- Add repairer_id to claim_fulfillment table to track which repairer is assigned
ALTER TABLE claim_fulfillment 
ADD COLUMN IF NOT EXISTS repairer_id uuid REFERENCES auth.users(id);

-- Add RLS policy for repairer agents to view their assigned fulfillment jobs
CREATE POLICY "Repairer agents can view assigned fulfillment jobs"
ON claim_fulfillment
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'repairer_agent'::app_role) 
  AND repairer_id = auth.uid()
);

-- Add RLS policy for repairer agents to update their assigned fulfillment jobs
CREATE POLICY "Repairer agents can update assigned fulfillment jobs"
ON claim_fulfillment
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'repairer_agent'::app_role) 
  AND repairer_id = auth.uid()
);