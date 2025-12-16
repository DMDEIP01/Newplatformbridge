-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active repairers" ON public.repairers;

-- Create new policy that allows both authenticated and anonymous users to view active repairers
CREATE POLICY "Anyone can view active repairers"
ON public.repairers
FOR SELECT
TO anon, authenticated
USING (is_active = true);