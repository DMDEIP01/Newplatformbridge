-- Allow system admins to update products
-- Using explicit function signature to avoid ambiguity
CREATE POLICY "System admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'system_admin'::app_role
  )
);

-- Allow system admins to insert products
CREATE POLICY "System admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'system_admin'::app_role
  )
);

-- Allow system admins to delete products
CREATE POLICY "System admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'system_admin'::app_role
  )
);