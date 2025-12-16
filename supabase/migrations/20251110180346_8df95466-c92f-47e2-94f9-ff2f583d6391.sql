-- Fix search_path for generate_complaint_reference function
CREATE OR REPLACE FUNCTION generate_complaint_reference()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ref_number TEXT;
BEGIN
  ref_number := 'CMP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN ref_number;
END;
$$;