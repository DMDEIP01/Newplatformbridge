-- Allow complaints agents and admins to view profiles of other complaints agents
CREATE POLICY "Complaints agents can view other agent profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'complaints_agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role IN ('complaints_agent', 'admin')
  )
);