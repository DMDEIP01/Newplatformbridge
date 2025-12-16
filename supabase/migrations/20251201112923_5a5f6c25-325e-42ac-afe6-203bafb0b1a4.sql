-- Drop and recreate the function with correct schema reference
DROP FUNCTION IF EXISTS public.verify_pin(uuid, text);

CREATE OR REPLACE FUNCTION public.verify_pin(
  user_id uuid,
  pin_attempt text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Get the stored hash
  SELECT pin_hash INTO stored_hash
  FROM user_pins
  WHERE user_pins.user_id = verify_pin.user_id;
  
  -- Return true if PIN matches using extensions.crypt
  IF stored_hash IS NOT NULL THEN
    RETURN (stored_hash = extensions.crypt(pin_attempt, stored_hash));
  END IF;
  
  RETURN false;
END;
$$;