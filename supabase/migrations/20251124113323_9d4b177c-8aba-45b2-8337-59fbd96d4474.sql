-- Update RLS policy to allow admin and system_admin roles to manage perils
DROP POLICY IF EXISTS "System admins can manage perils" ON public.perils;

CREATE POLICY "Admins and system admins can manage perils"
ON public.perils
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin'::app_role, 'system_admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin'::app_role, 'system_admin'::app_role)
  )
);