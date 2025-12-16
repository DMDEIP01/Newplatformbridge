-- Update policy-documents bucket to allow text files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf', 'text/plain', 'application/octet-stream']::text[]
WHERE id = 'policy-documents';