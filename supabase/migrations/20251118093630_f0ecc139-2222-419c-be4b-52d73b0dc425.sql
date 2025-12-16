-- Drop the existing policy that doesn't work properly
DROP POLICY IF EXISTS "Anyone authenticated can view active programs" ON public.programs;

-- Create a new policy that explicitly allows authenticated users to view active programs
CREATE POLICY "Authenticated users can view active programs"
ON public.programs
FOR SELECT
TO authenticated
USING (is_active = true);

-- Keep the system admin policies as they are
-- System admins can still view all programs and manage them