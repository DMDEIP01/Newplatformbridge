-- Add country field to repairers table
ALTER TABLE public.repairers 
ADD COLUMN country text;

-- Add index for better search performance
CREATE INDEX idx_repairers_country ON public.repairers(country);