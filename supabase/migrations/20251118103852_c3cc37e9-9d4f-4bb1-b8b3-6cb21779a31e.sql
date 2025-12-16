-- Add tax tracking fields to products table
ALTER TABLE public.products
ADD COLUMN tax_type text CHECK (tax_type IN ('IPT', 'Other')),
ADD COLUMN tax_name text,
ADD COLUMN tax_value numeric,
ADD COLUMN tax_value_type text CHECK (tax_value_type IN ('amount', 'percentage'));