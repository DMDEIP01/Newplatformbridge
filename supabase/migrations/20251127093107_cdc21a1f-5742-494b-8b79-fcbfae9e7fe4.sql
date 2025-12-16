-- Create device_categories table
CREATE TABLE IF NOT EXISTS public.device_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active device categories"
ON public.device_categories
FOR SELECT
USING (is_active = true);

-- System admins can manage device categories
CREATE POLICY "System admins can manage device categories"
ON public.device_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);

-- Insert common device categories
INSERT INTO public.device_categories (name) VALUES
  ('Smartphones'),
  ('Tablets'),
  ('Laptops'),
  ('Smartwatches'),
  ('Headphones'),
  ('Gaming Consoles'),
  ('Cameras'),
  ('TVs'),
  ('Home Appliances')
ON CONFLICT (name) DO NOTHING;