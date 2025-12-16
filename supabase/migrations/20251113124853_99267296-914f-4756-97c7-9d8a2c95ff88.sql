-- Update claims UPDATE policy to include retail_agent

DROP POLICY IF EXISTS "Agents can update claims" ON public.claims;

CREATE POLICY "Agents can update claims"
ON public.claims
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'consultant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'claims_agent'::app_role)
  OR has_role(auth.uid(), 'complaints_agent'::app_role)
  OR has_role(auth.uid(), 'retail_agent'::app_role)
);