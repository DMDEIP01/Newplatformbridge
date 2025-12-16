-- Create storage policy for repairer agents to upload inspection photos
CREATE POLICY "Repairers can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('repairer_agent', 'system_admin', 'admin', 'claims_agent')
  )
);

-- Create policy for reading inspection photos
CREATE POLICY "Authenticated users can view inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Create policy for repairers to update their uploaded photos
CREATE POLICY "Repairers can update inspection photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('repairer_agent', 'system_admin', 'admin', 'claims_agent')
  )
);

-- Create policy for repairers to delete inspection photos
CREATE POLICY "Repairers can delete inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('repairer_agent', 'system_admin', 'admin', 'claims_agent')
  )
);