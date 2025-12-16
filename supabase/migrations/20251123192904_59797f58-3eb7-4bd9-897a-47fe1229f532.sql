-- Add evidence_requirements column to perils table
ALTER TABLE public.perils 
ADD COLUMN evidence_requirements JSONB DEFAULT '[]'::jsonb;