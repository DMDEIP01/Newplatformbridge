-- Make type and tier optional with defaults for products table
ALTER TABLE public.products 
ALTER COLUMN type SET DEFAULT 'Standard',
ALTER COLUMN tier SET DEFAULT 1;

-- Update existing products to have default values if null
UPDATE public.products SET type = 'Standard' WHERE type IS NULL;
UPDATE public.products SET tier = 1 WHERE tier IS NULL;