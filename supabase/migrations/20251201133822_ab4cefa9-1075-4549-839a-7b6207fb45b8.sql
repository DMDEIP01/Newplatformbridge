-- Add RLS policy to allow program admins to view consultants in their program
CREATE POLICY "Program admins can view consultants in their program"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if the current user is an admin for the same program
  EXISTS (
    SELECT 1
    FROM public.user_roles admin_roles
    WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.role = 'admin'
      AND (
        -- Either the admin has no program_id (global admin)
        admin_roles.program_id IS NULL
        -- Or the admin's program matches the consultant's program
        OR admin_roles.program_id = user_roles.program_id
      )
  )
);

-- Add RLS policy to allow program admins to view profiles of users in their program
CREATE POLICY "Program admins can view profiles in their program"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if the current user is an admin for a program that this user belongs to
  EXISTS (
    SELECT 1
    FROM public.user_roles admin_roles
    WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.role = 'admin'
      AND (
        -- Global admins can see everyone
        admin_roles.program_id IS NULL
        -- Or check if the profile's user has a role in the same program
        OR EXISTS (
          SELECT 1
          FROM public.user_roles user_program_roles
          WHERE user_program_roles.user_id = profiles.id
            AND user_program_roles.program_id = admin_roles.program_id
        )
      )
  )
);