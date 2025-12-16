-- Create storage bucket for claim receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-receipts', 'claim-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for claim receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'claim-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own receipts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'claim-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'claim-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);