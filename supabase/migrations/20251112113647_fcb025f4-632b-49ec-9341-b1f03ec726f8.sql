-- Allow consultants to insert policies
CREATE POLICY "Consultants can insert policies"
ON public.policies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'consultant'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow consultants to update policies they've created or are assigned to
CREATE POLICY "Consultants can update assigned policies"
ON public.policies
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND consultant_id = auth.uid()
);