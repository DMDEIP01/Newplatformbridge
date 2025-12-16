-- Create devices table for comprehensive device management
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  device_category TEXT NOT NULL,
  model_name TEXT NOT NULL,
  rrp NUMERIC NOT NULL,
  include_in_promos BOOLEAN NOT NULL DEFAULT true,
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- System admins can manage devices
CREATE POLICY "System admins can manage devices"
ON public.devices
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'system_admin'::app_role
  )
);

-- Anyone can view devices (needed for product assignment)
CREATE POLICY "Anyone can view devices"
ON public.devices
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_devices_manufacturer ON public.devices(manufacturer);
CREATE INDEX idx_devices_category ON public.devices(device_category);
CREATE INDEX idx_devices_promos ON public.devices(include_in_promos);