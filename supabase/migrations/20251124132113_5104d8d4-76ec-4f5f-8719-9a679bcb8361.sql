-- Add RLS policy to allow system admins to view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'::app_role
  )
);

-- Add RLS policy to allow retail agents to view all profiles
CREATE POLICY "Retail agents can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid)
  OR public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
  OR public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid)
);