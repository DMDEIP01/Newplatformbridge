-- First, update the generate_claim_number function to use new format with CL
CREATE OR REPLACE FUNCTION public.generate_claim_number(product_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  
  -- New format: PREFIXCL-NNNNN (5 digits)
  new_number := prefix || 'CL-' || LPAD(seq_val::TEXT, 5, '0');
  RETURN new_number;
END;
$function$;

-- Update all existing claims to use the new format with unique sequential numbers
DO $$
DECLARE
  claim_record RECORD;
  prefix TEXT;
  ew_counter INTEGER := 0;
  il_counter INTEGER := 0;
  im_counter INTEGER := 0;
  new_claim_number TEXT;
BEGIN
  -- Process claims ordered by submitted_date to maintain chronological order
  FOR claim_record IN 
    SELECT c.id, c.claim_number, c.submitted_date, prod.name as product_name
    FROM claims c
    JOIN policies p ON c.policy_id = p.id
    JOIN products prod ON p.product_id = prod.id
    ORDER BY c.submitted_date ASC
  LOOP
    -- Get product prefix
    prefix := public.get_product_prefix(claim_record.product_name);
    
    -- Increment appropriate counter
    IF prefix = 'EW' THEN
      ew_counter := ew_counter + 1;
      new_claim_number := 'EWCL-' || LPAD(ew_counter::TEXT, 5, '0');
    ELSIF prefix = 'IL' THEN
      il_counter := il_counter + 1;
      new_claim_number := 'ILCL-' || LPAD(il_counter::TEXT, 5, '0');
    ELSIF prefix = 'IM' THEN
      im_counter := im_counter + 1;
      new_claim_number := 'IMCL-' || LPAD(im_counter::TEXT, 5, '0');
    ELSE
      ew_counter := ew_counter + 1;
      new_claim_number := 'EWCL-' || LPAD(ew_counter::TEXT, 5, '0');
    END IF;
    
    -- Update the claim with new unique format
    UPDATE claims 
    SET claim_number = new_claim_number
    WHERE id = claim_record.id;
  END LOOP;
  
  -- Update the sequences to start after the highest number used
  PERFORM setval('claim_number_ew_seq', ew_counter + 1, false);
  PERFORM setval('claim_number_il_seq', il_counter + 1, false);
  PERFORM setval('claim_number_im_seq', im_counter + 1, false);
  
  RAISE NOTICE 'Updated % EW claims, % IL claims, % IM claims', ew_counter, il_counter, im_counter;
END $$;

-- Add a comment to document the change
COMMENT ON FUNCTION public.generate_claim_number(text) IS 
'Generates claim numbers in format: PREFIXCL-NNNNN where PREFIX is product prefix (EW/IL/IM), CL identifies it as a claim, and NNNNN is a 5-digit sequence number. This distinguishes claims from policies which use PREFIX-NNNNNN format.';