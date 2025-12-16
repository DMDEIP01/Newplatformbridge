
-- Add claims_agent role to the RLS policies for service_request_messages
-- Using 3-parameter version of has_role function with NULL for program_id

-- Drop the existing policy for viewing messages
DROP POLICY IF EXISTS "Retail agents can view all messages" ON service_request_messages;

-- Recreate it with claims_agent included
CREATE POLICY "Agents can view all messages"
ON service_request_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);

-- Also update the insert policy
DROP POLICY IF EXISTS "Retail agents can insert messages" ON service_request_messages;

CREATE POLICY "Agents can insert messages"
ON service_request_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);

-- Also update the update policy
DROP POLICY IF EXISTS "Retail agents can update messages" ON service_request_messages;

CREATE POLICY "Agents can update messages"
ON service_request_messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);
