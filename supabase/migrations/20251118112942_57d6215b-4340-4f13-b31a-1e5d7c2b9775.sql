-- Add password change tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_profiles_must_change_password 
ON public.profiles(must_change_password) 
WHERE must_change_password = true;