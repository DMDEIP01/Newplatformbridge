-- Create service_requests table
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id),
  request_reference TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Add notes field to policies table
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable RLS on service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_requests
CREATE POLICY "Consultants can view all service requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Consultants can create service requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Consultants can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Function to generate service request reference
CREATE OR REPLACE FUNCTION public.generate_service_request_reference()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ref_number TEXT;
BEGIN
  ref_number := 'SR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN ref_number;
END;
$$;

-- Set default for request_reference
ALTER TABLE service_requests
ALTER COLUMN request_reference SET DEFAULT generate_service_request_reference();

-- Create trigger for updated_at
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();