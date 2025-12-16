-- Update RLS policies for claims table to allow complaints agents

-- Drop existing consultant policies
DROP POLICY IF EXISTS "Consultants can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Consultants can update all claims" ON public.claims;

-- Create new policies that include complaints agents
CREATE POLICY "Agents can view all claims"
ON public.claims
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
);

CREATE POLICY "Agents can update claims"
ON public.claims
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
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
);