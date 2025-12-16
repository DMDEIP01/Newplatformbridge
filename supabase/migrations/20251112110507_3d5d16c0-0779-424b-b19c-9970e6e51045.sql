-- Create policy to allow consultants/admins to view covered items
CREATE POLICY "Consultants can view covered items"
ON public.covered_items
FOR SELECT
USING (
  has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
