-- Drop the old policy that only checks user_id
DROP POLICY IF EXISTS "Users can view own claims" ON public.claims;

-- Create new policy that allows users to see claims for their policies
CREATE POLICY "Users can view claims for their policies" 
ON public.claims 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.policies 
    WHERE policies.id = claims.policy_id 
    AND policies.user_id = auth.uid()
  )
);