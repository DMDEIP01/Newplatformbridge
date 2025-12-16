-- Create test consultant account directly
-- Note: This uses a hashed password for "Test123456!"
-- The password hash is generated using Supabase's bcrypt implementation

DO $$
DECLARE
  consultant_user_id uuid;
BEGIN
  -- Insert the auth user (using service role key, this bypasses normal signup)
  -- We'll create a placeholder entry that will be replaced by proper signup
  
  -- First check if consultant already exists
  SELECT id INTO consultant_user_id
  FROM auth.users
  WHERE email = 'consultant@test.com';
  
  IF consultant_user_id IS NULL THEN
    -- Insert into profiles for the consultant
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'consultant@test.com',
      crypt('Test123456!', gen_salt('bf')),
      now(),
      '{"full_name": "Test Consultant"}'::jsonb,
      now(),
      now(),
      '',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO consultant_user_id;
  END IF;
  
  -- Add consultant role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (consultant_user_id, 'consultant')
  ON CONFLICT (user_id, role) DO NOTHING;
  
END $$;