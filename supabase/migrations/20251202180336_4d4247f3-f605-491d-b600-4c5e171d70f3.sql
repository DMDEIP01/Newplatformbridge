-- Allow users to update covered items for their own policies
CREATE POLICY "Users can update own covered items"
ON public.covered_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM policies
  WHERE policies.id = covered_items.policy_id
  AND policies.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM policies
  WHERE policies.id = covered_items.policy_id
  AND policies.user_id = auth.uid()
));