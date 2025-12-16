-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']::text[]
);

-- RLS policies for policy documents storage
CREATE POLICY "Consultants can upload policy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents' AND
  (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Consultants can view policy documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can view their policy documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add columns to track customer address in profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Update documents table to support policy document types
CREATE TYPE document_subtype AS ENUM ('ipid', 'terms_conditions', 'policy_schedule', 'receipt', 'other');

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS document_subtype document_subtype DEFAULT 'other';

-- Add index for faster policy document lookups
CREATE INDEX IF NOT EXISTS idx_documents_policy_subtype ON documents(policy_id, document_subtype) WHERE policy_id IS NOT NULL;