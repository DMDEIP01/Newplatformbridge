-- Allow claims agents and authorized roles to download from claim-receipts bucket
CREATE POLICY "Agents can download from claim-receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-receipts' AND
  (
    public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid)
  )
);

-- Allow claims agents and authorized roles to download from claim-documents bucket
CREATE POLICY "Agents can download from claim-documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-documents' AND
  (
    public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid)
  )
);