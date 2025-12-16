-- Add eligibility, validity, and renewal rules columns to products table
ALTER TABLE public.products
ADD COLUMN eligibility_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN validity_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN renewal_rules JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.eligibility_rules IS 'JSON structure for customer, product, and verification eligibility criteria';
COMMENT ON COLUMN public.products.validity_rules IS 'JSON structure for coverage validity, activation, expiration, and cancellation rules';
COMMENT ON COLUMN public.products.renewal_rules IS 'JSON structure for renewal eligibility, window, pricing, and documentation requirements';