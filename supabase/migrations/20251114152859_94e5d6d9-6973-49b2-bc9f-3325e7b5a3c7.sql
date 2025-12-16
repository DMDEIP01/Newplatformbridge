-- Drop the existing restrictive policy for repairer agents
DROP POLICY IF EXISTS "Repairer agents can view assigned fulfillment jobs" ON claim_fulfillment;

-- Create new policy to allow repairer agents to view all fulfillment jobs
CREATE POLICY "Repairer agents can view all fulfillment jobs"
ON claim_fulfillment
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'repairer_agent'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
);