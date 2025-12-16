-- Update the handle_new_user function to automatically link policies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Link any existing policies with matching customer_email
  UPDATE public.policies
  SET user_id = NEW.id
  WHERE customer_email ILIKE NEW.email
    AND user_id != NEW.id;
  
  RETURN NEW;
END;
$$;