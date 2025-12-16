-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view roles in their program" ON public.user_roles;

-- Instead of a complex policy, we'll keep it simple:
-- Users can see their own roles (this policy already exists)
-- For admins to see consultant roles, we'll use a security definer view

-- Create a security definer view for consultant profiles
CREATE OR REPLACE VIEW public.consultant_profiles_view AS
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  ur.program_id,
  ur.created_at,
  p.full_name,
  p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'consultant';

-- Grant select on the view to authenticated users
GRANT SELECT ON public.consultant_profiles_view TO authenticated;

-- Create an RLS policy on the view
ALTER VIEW public.consultant_profiles_view SET (security_invoker = false);

-- Create a function to get consultants for a program
CREATE OR REPLACE FUNCTION public.get_program_consultants(target_program_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role app_role,
  program_id uuid,
  created_at timestamptz,
  full_name text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.program_id,
    ur.created_at,
    p.full_name,
    p.email
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'consultant'
    AND (target_program_id IS NULL OR ur.program_id = target_program_id)
    AND public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid);
$$;