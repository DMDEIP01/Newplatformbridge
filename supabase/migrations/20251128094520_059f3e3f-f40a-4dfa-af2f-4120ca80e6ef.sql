
-- Function to automatically set program_id for new policies based on their product
CREATE OR REPLACE FUNCTION public.set_policy_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_program_id uuid;
BEGIN
  -- Get the program_id from the product's program assignment
  SELECT pp.program_id INTO product_program_id
  FROM public.program_products pp
  WHERE pp.product_id = NEW.product_id
    AND pp.is_active = true
  LIMIT 1;
  
  -- Set the program_id if found
  IF product_program_id IS NOT NULL THEN
    NEW.program_id := product_program_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert on policies
DROP TRIGGER IF EXISTS set_policy_program_trigger ON public.policies;
CREATE TRIGGER set_policy_program_trigger
  BEFORE INSERT ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_policy_program();
