-- Create user_pins table for MFA
CREATE TABLE IF NOT EXISTS public.user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  must_change_pin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own PIN
CREATE POLICY "Users can view own PIN"
  ON public.user_pins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own PIN"
  ON public.user_pins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert PINs
CREATE POLICY "System can insert PINs"
  ON public.user_pins
  FOR INSERT
  WITH CHECK (true);

-- Admins can manage all PINs (using the 3-parameter version)
CREATE POLICY "Admins can manage PINs"
  ON public.user_pins
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid));

-- Create trigger to update updated_at
CREATE TRIGGER update_user_pins_updated_at
  BEFORE UPDATE ON public.user_pins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock PIN data for all existing users
-- Using bcrypt to hash "1234"
INSERT INTO public.user_pins (user_id, pin_hash, must_change_pin)
SELECT 
  p.id,
  crypt('1234', gen_salt('bf')),
  false
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;