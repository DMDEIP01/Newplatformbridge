-- Drop existing restrictive policy
DROP POLICY IF EXISTS "System admins can manage programs" ON programs;
DROP POLICY IF EXISTS "Anyone authenticated can view active programs" ON programs;
DROP POLICY IF EXISTS "System admins can view all programs" ON programs;

-- Allow system admins to manage programs
CREATE POLICY "System admins can manage programs"
ON programs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'::app_role
  )
);

-- Allow authenticated users to view active programs
CREATE POLICY "Anyone authenticated can view active programs"
ON programs
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow system admins to view all programs
CREATE POLICY "System admins can view all programs"
ON programs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'::app_role
  )
);