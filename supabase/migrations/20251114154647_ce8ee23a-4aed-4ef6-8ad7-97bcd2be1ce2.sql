-- Allow repairer agents to view claims associated with fulfillment jobs
DROP POLICY IF EXISTS "Agents can view all claims" ON claims;

CREATE POLICY "Agents can view all claims"
ON claims FOR SELECT
USING (
  has_role(auth.uid(), 'consultant'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'claims_agent'::app_role) OR 
  has_role(auth.uid(), 'complaints_agent'::app_role) OR 
  has_role(auth.uid(), 'retail_agent'::app_role) OR
  has_role(auth.uid(), 'repairer_agent'::app_role)
);

-- Allow repairer agents to update claim status when updating fulfillment jobs
DROP POLICY IF EXISTS "Agents can update claims" ON claims;

CREATE POLICY "Agents can update claims"
ON claims FOR UPDATE
USING (
  has_role(auth.uid(), 'consultant'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'claims_agent'::app_role) OR 
  has_role(auth.uid(), 'complaints_agent'::app_role) OR 
  has_role(auth.uid(), 'retail_agent'::app_role) OR
  has_role(auth.uid(), 'repairer_agent'::app_role)
);

-- Allow repairer agents to insert claim status history
DROP POLICY IF EXISTS "Users can insert own claim history" ON claim_status_history;

CREATE POLICY "Users can insert claim history"
ON claim_status_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM claims
    WHERE claims.id = claim_status_history.claim_id
    AND (claims.user_id = auth.uid() OR 
         has_role(auth.uid(), 'repairer_agent'::app_role) OR
         has_role(auth.uid(), 'admin'::app_role) OR
         has_role(auth.uid(), 'claims_agent'::app_role) OR
         has_role(auth.uid(), 'retail_agent'::app_role))
  )
);