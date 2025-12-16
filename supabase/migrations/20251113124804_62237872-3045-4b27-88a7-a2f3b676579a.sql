-- Update RLS policies for claims to include retail_agent

-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Agents can insert claims" ON public.claims;

-- Recreate with retail_agent included for viewing and inserting
CREATE POLICY "Agents can view all claims"
ON public.claims
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
);

CREATE POLICY "Agents can insert claims"
ON public.claims
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
);

-- Keep update restricted to specialized agents only
-- (retail_agent intentionally excluded from updates)