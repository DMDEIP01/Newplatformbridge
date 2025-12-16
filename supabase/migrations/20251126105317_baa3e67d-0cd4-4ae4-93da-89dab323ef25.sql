-- Allow retail agents and admins to update policies
CREATE POLICY "Retail agents can update policies"
ON public.policies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'retail_agent', NULL::uuid) OR 
  has_role(auth.uid(), 'admin', NULL::uuid)
)
WITH CHECK (
  has_role(auth.uid(), 'retail_agent', NULL::uuid) OR 
  has_role(auth.uid(), 'admin', NULL::uuid)
);