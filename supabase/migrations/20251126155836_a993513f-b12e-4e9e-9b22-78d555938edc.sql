-- Add reference_formats field to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS reference_formats jsonb DEFAULT '{
  "policy_number": {"format": "{product_prefix}-{sequence:6}", "description": "Policy number format"},
  "claim_number": {"format": "{product_prefix}-{sequence:6}", "description": "Claim number format"}
}'::jsonb;

-- Create sequences for policy and claim numbers per product prefix
CREATE SEQUENCE IF NOT EXISTS policy_number_ew_seq START 1;
CREATE SEQUENCE IF NOT EXISTS policy_number_il_seq START 1;
CREATE SEQUENCE IF NOT EXISTS policy_number_im_seq START 1;
CREATE SEQUENCE IF NOT EXISTS claim_number_ew_seq START 1;
CREATE SEQUENCE IF NOT EXISTS claim_number_il_seq START 1;
CREATE SEQUENCE IF NOT EXISTS claim_number_im_seq START 1;

-- Function to get product prefix from product name
CREATE OR REPLACE FUNCTION public.get_product_prefix(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF product_name ILIKE '%extended%warranty%' OR product_name ILIKE '%EW%' THEN
    RETURN 'EW';
  ELSIF product_name ILIKE '%insurance%lite%' OR product_name ILIKE '%IL%' THEN
    RETURN 'IL';
  ELSIF product_name ILIKE '%insurance%max%' OR product_name ILIKE '%IM%' THEN
    RETURN 'IM';
  ELSE
    RETURN 'EW'; -- Default to Extended Warranty
  END IF;
END;
$$;

-- Function to generate policy number
CREATE OR REPLACE FUNCTION public.generate_policy_number(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  new_number TEXT;
BEGIN
  prefix := get_product_prefix(product_name);
  
  IF prefix = 'EW' THEN
    seq_val := nextval('policy_number_ew_seq');
  ELSIF prefix = 'IL' THEN
    seq_val := nextval('policy_number_il_seq');
  ELSIF prefix = 'IM' THEN
    seq_val := nextval('policy_number_im_seq');
  ELSE
    seq_val := nextval('policy_number_ew_seq');
  END IF;
  
  new_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Function to generate claim number
CREATE OR REPLACE FUNCTION public.generate_claim_number(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  new_number TEXT;
BEGIN
  prefix := get_product_prefix(product_name);
  
  IF prefix = 'EW' THEN
    seq_val := nextval('claim_number_ew_seq');
  ELSIF prefix = 'IL' THEN
    seq_val := nextval('claim_number_il_seq');
  ELSIF prefix = 'IM' THEN
    seq_val := nextval('claim_number_im_seq');
  ELSE
    seq_val := nextval('claim_number_ew_seq');
  END IF;
  
  new_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Update existing policies with new format
DO $$
DECLARE
  policy_rec RECORD;
  new_policy_number TEXT;
  prefix TEXT;
BEGIN
  FOR policy_rec IN 
    SELECT p.id, p.policy_number, pr.name as product_name
    FROM policies p
    JOIN products pr ON p.product_id = pr.id
    ORDER BY p.created_at
  LOOP
    new_policy_number := generate_policy_number(policy_rec.product_name);
    
    UPDATE policies 
    SET policy_number = new_policy_number
    WHERE id = policy_rec.id;
  END LOOP;
END $$;

-- Update existing claims with new format
DO $$
DECLARE
  claim_rec RECORD;
  new_claim_number TEXT;
BEGIN
  FOR claim_rec IN 
    SELECT c.id, c.claim_number, pr.name as product_name
    FROM claims c
    JOIN policies p ON c.policy_id = p.id
    JOIN products pr ON p.product_id = pr.id
    ORDER BY c.submitted_date
  LOOP
    new_claim_number := generate_claim_number(claim_rec.product_name);
    
    UPDATE claims 
    SET claim_number = new_claim_number
    WHERE id = claim_rec.id;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.get_product_prefix IS 'Returns product prefix (EW, IL, IM) based on product name';
COMMENT ON FUNCTION public.generate_policy_number IS 'Generates sequential policy number with product prefix';
COMMENT ON FUNCTION public.generate_claim_number IS 'Generates sequential claim number with product prefix';