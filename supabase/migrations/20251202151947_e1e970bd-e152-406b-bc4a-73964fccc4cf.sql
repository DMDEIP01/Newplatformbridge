-- Add repairer_agent to policies SELECT policy so they can see customer information for their assigned jobs

-- First drop the existing policy
DROP POLICY IF EXISTS "Agents can view all policies" ON policies;

-- Recreate with repairer_agent included (using 3-param version of has_role)
CREATE POLICY "Agents can view all policies" ON policies
FOR SELECT
USING (
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'repairer_agent'::app_role, NULL::uuid)
);