-- Update RLS policy for policies table to allow retail_agent and claims_agent to view all policies
DROP POLICY IF EXISTS "Consultants can view all policies" ON public.policies;

CREATE POLICY "Agents can view all policies"
ON public.policies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
);

-- Update RLS policy for covered_items to allow retail_agent and claims_agent to view items
DROP POLICY IF EXISTS "Consultants can view covered items" ON public.covered_items;

CREATE POLICY "Agents can view covered items"
ON public.covered_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
);

-- Update RLS policy for policies to allow retail_agent to insert policies
DROP POLICY IF EXISTS "Consultants can insert policies" ON public.policies;

CREATE POLICY "Agents can insert policies"
ON public.policies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
);