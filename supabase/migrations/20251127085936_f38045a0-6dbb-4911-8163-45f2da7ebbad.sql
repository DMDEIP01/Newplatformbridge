-- Allow complaints agents to create complaints
CREATE POLICY "Complaints agents can create complaints"
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);