-- Add perils column to products table
ALTER TABLE public.products 
ADD COLUMN perils text[] DEFAULT '{}';

COMMENT ON COLUMN public.products.perils IS 'List of perils covered by this product (e.g., Screen damage, Theft, Water damage, etc.)';