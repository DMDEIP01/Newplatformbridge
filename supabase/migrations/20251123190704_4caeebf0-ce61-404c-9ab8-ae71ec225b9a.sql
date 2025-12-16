-- Add metadata column to documents table to store AI analysis results
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for faster queries on AI analysis data
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING gin(metadata);