-- Add store_commission column to products table
ALTER TABLE public.products
ADD COLUMN store_commission numeric DEFAULT 5 NOT NULL;

-- Update existing products to have 5% commission
UPDATE public.products
SET store_commission = 5
WHERE store_commission IS NULL;