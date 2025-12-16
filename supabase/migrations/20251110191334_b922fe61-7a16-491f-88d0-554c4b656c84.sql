-- Add response fields to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITH TIME ZONE;