-- Allow authenticated users to read from inspection-photos bucket
CREATE POLICY "Authenticated users can read inspection photos" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Allow authenticated users to insert to inspection-photos bucket
CREATE POLICY "Authenticated users can upload inspection photos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');