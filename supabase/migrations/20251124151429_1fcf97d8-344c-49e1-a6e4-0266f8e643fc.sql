
-- Create function to auto-link policy to existing user on creation
CREATE OR REPLACE FUNCTION public.link_policy_to_existing_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_user_id uuid;
BEGIN
  -- Check if there's a user with matching email
  SELECT id INTO matching_user_id
  FROM public.profiles
  WHERE email ILIKE NEW.customer_email
  LIMIT 1;
  
  -- If found, update the policy user_id
  IF matching_user_id IS NOT NULL THEN
    NEW.user_id := matching_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before policy insert
DROP TRIGGER IF EXISTS link_policy_on_insert ON public.policies;
CREATE TRIGGER link_policy_on_insert
  BEFORE INSERT ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.link_policy_to_existing_user();
