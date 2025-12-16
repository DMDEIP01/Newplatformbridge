-- Drop the old conflicting policy
DROP POLICY IF EXISTS "Agents can view all claim documents" ON storage.objects;

-- Update claim-receipts policy to include consultant role
DROP POLICY IF EXISTS "Agents can download from claim-receipts" ON storage.objects;

CREATE POLICY "Agents can download from claim-receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-receipts' AND
  (
    public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  )
);

-- Update claim-documents policy to include consultant role  
DROP POLICY IF EXISTS "Agents can download from claim-documents" ON storage.objects;

CREATE POLICY "Agents can download from claim-documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-documents' AND
  (
    public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  )
);