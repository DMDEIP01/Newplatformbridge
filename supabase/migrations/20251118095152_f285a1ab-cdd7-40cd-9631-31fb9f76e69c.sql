-- Add peril_details column to products table to store rejection terms
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS peril_details jsonb DEFAULT '{}'::jsonb;