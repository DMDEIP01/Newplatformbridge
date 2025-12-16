-- Allow agents to update documents for claims and service requests
CREATE POLICY "Agents can update claim and service request documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  -- Agent must have appropriate role
  (
    has_role(auth.uid(), 'claims_agent', NULL) OR 
    has_role(auth.uid(), 'retail_agent', NULL) OR 
    has_role(auth.uid(), 'admin', NULL) OR
    has_role(auth.uid(), 'consultant', NULL)
  )
  AND
  -- Document must be linked to a service request or claim
  (service_request_id IS NOT NULL OR claim_id IS NOT NULL)
)
WITH CHECK (
  -- Same conditions for the updated row
  (
    has_role(auth.uid(), 'claims_agent', NULL) OR 
    has_role(auth.uid(), 'retail_agent', NULL) OR 
    has_role(auth.uid(), 'admin', NULL) OR
    has_role(auth.uid(), 'consultant', NULL)
  )
  AND
  (service_request_id IS NOT NULL OR claim_id IS NOT NULL)
);