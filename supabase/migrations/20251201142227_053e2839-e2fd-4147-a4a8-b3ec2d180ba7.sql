-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Program admins can view consultants in their program" ON public.user_roles;
DROP POLICY IF EXISTS "Program admins can view profiles in their program" ON public.profiles;

-- Add a simpler RLS policy for user_roles that doesn't cause recursion
-- Use the 3-parameter version with NULL to disambiguate
CREATE POLICY "Users can view roles in their program"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own roles
  user_id = auth.uid()
  OR
  -- Admins can see roles in their program
  (
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) 
    AND (
      program_id IN (
        SELECT program_id 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
      OR
      -- Global admins (no program_id) can see all
      EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND program_id IS NULL
      )
    )
  )
);

-- Add policy for profiles that allows admins to view profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);