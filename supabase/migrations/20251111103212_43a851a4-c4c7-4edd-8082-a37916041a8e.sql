-- Add INSERT policy for profiles to allow trigger to work
CREATE POLICY "Allow trigger to insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Now create the consultant user manually
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'consultant@test.com';
  v_password text := 'Test123456!';
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- If user doesn't exist, we can't create it directly via SQL
  -- So we'll just ensure the policies are correct
  
  IF v_user_id IS NOT NULL THEN
    -- User exists, ensure they have consultant role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'consultant')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Consultant role added to existing user';
  ELSE
    RAISE NOTICE 'User does not exist yet - will be created via edge function';
  END IF;
END $$;