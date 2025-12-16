-- Add is_active column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);