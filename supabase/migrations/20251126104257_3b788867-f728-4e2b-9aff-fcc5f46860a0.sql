-- Allow retail agents and admins to insert covered items for any policy
CREATE POLICY "Retail agents can insert covered items"
ON public.covered_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);