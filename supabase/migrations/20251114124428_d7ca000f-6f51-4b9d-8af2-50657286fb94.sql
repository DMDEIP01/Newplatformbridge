-- Create storage bucket for claim documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-documents', 'claim-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for claim documents bucket
CREATE POLICY "Users can upload their own claim documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'claim-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own claim documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents can view all claim documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-documents' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'retail_agent'::app_role) OR
    has_role(auth.uid(), 'claims_agent'::app_role)
  )
);

CREATE POLICY "Users can delete their own claim documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'claim-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);