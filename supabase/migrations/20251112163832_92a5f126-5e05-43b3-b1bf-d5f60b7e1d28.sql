-- Replace the previous agent profile visibility policy to avoid RLS recursion on user_roles
DROP POLICY IF EXISTS "Complaints agents can view other agent profiles" ON public.profiles;

CREATE POLICY "Complaints agents can view other agent profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'complaints_agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    has_role(profiles.id, 'complaints_agent'::app_role)
    OR has_role(profiles.id, 'admin'::app_role)
  )
);