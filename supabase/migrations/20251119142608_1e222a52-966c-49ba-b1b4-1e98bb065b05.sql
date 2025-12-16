-- Allow admins and retail agents to create promotions
CREATE POLICY "Admins and retail agents can insert promotions"
ON promotions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'system_admin'::app_role, NULL) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL) OR
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL)
);