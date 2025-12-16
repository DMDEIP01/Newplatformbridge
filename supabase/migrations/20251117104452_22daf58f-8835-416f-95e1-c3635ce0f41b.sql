-- Add new columns to products table for comprehensive product management
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_name_external text,
ADD COLUMN IF NOT EXISTS premium_frequency text DEFAULT 'monthly' CHECK (premium_frequency IN ('weekly', 'monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS device_categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS policy_term_years integer DEFAULT 1 CHECK (policy_term_years >= 1 AND policy_term_years <= 5),
ADD COLUMN IF NOT EXISTS payment_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS excess_2 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS link_code text,
ADD COLUMN IF NOT EXISTS fulfillment_method text CHECK (fulfillment_method IN ('Exchange', 'Repair', 'Both')),
ADD COLUMN IF NOT EXISTS voucher_options text[] DEFAULT '{}';

-- Rename existing excess column to excess_1 for clarity
ALTER TABLE public.products RENAME COLUMN excess TO excess_1;

-- Add comment for documentation
COMMENT ON COLUMN public.products.device_categories IS 'Array of device categories this product applies to';
COMMENT ON COLUMN public.products.payment_types IS 'Supported payment types: DD (Direct Debit), CC (Credit Card), etc';
COMMENT ON COLUMN public.products.voucher_options IS 'Multi-select voucher options for this product';